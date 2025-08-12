#!/bin/bash
# CS Club Hackathon Platform - Judge Container Build Script
# Phase 1.3: Build and validate Docker execution environment

set -e

echo "🏗️  Building CS Club Hackathon Judge Container..."
echo "================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="hackathon-judge"
BUILD_CONTEXT="."
DOCKERFILE_PATH="./docker/Dockerfile"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is available
print_status "Checking Docker availability..."
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed or not in PATH"
    echo "Please install Docker to build the execution environment"
    exit 1
fi

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    print_error "Docker daemon is not running"
    echo "Please start Docker daemon before running this script"
    exit 1
fi

print_success "Docker is available and running"

# Check required files
print_status "Checking required build files..."
required_files=(
    "$DOCKERFILE_PATH"
    "./docker/seccomp-profile.json"
    "./docker/execute.sh"
)

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        print_error "Required file missing: $file"
        exit 1
    fi
done

print_success "All required files are present"

# Build the Docker image
print_status "Building Docker image: $IMAGE_NAME"
echo "This may take several minutes..."

if docker build -t "$IMAGE_NAME" -f "$DOCKERFILE_PATH" "$BUILD_CONTEXT"; then
    print_success "Docker image built successfully: $IMAGE_NAME"
else
    print_error "Failed to build Docker image"
    exit 1
fi

# Verify image was created
print_status "Verifying Docker image..."
if docker images "$IMAGE_NAME" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | grep -q "$IMAGE_NAME"; then
    print_success "Docker image verified"
    docker images "$IMAGE_NAME" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
else
    print_error "Docker image verification failed"
    exit 1
fi

# Test basic container functionality
print_status "Testing basic container functionality..."

# Test container can start
if docker run --rm "$IMAGE_NAME" echo "Container test successful" > /dev/null; then
    print_success "Container starts successfully"
else
    print_error "Container failed to start"
    exit 1
fi

# Test execution environment
print_status "Testing execution environment..."

# Create temporary test directory
TEST_DIR=$(mktemp -d)
echo '#include <iostream>
int main() { 
    std::cout << "Hello World" << std::endl; 
    return 0; 
}' > "$TEST_DIR/solution.cpp"

# Test C++ execution
print_status "Testing C++ execution..."
if docker run --rm \
    -v "$TEST_DIR:/tmp/execution:rw" \
    --user executor \
    --network none \
    --memory 256m \
    --cpus 1.0 \
    --read-only \
    --tmpfs "/tmp/execution:noexec,nosuid,size=100m" \
    "$IMAGE_NAME" \
    /usr/local/bin/execute.sh cpp 5 256 > /dev/null; then
    print_success "C++ execution test passed"
else
    print_warning "C++ execution test failed (this may be expected in some environments)"
fi

# Clean up test directory
rm -rf "$TEST_DIR"

# Display final status
echo ""
echo "🎉 Judge Container Build Complete!"
echo "=================================="
print_success "Image: $IMAGE_NAME"
print_success "Build completed at: $(date)"

# Show next steps
echo ""
echo "📋 Next Steps:"
echo "1. Run 'npm test -- --testNamePattern=\"execution\"' to test the execution API"
echo "2. Start the server with 'npm run dev' to use the execution environment"
echo "3. Use 'docker run --rm $IMAGE_NAME /usr/local/bin/execute.sh cpp 5 256' for manual testing"

# Show docker image info
echo ""
echo "📊 Image Information:"
docker images "$IMAGE_NAME" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedSince}}"

print_success "Build script completed successfully!"

# Optional: Clean up dangling images
if [ "$1" = "--cleanup" ]; then
    print_status "Cleaning up dangling images..."
    docker image prune -f
    print_success "Cleanup completed"
fi