# CS Club Hackathon Platform - Code Execution Container
# Phase 1.3: Docker Code Execution Environment
FROM ubuntu:20.04

# Prevent interactive prompts during installation
ENV DEBIAN_FRONTEND=noninteractive

# Update system and install essential packages
RUN apt-get update && apt-get install -y \
    # Build tools and compilers
    build-essential \
    g++ \
    gcc \
    # Java runtime and compiler
    openjdk-11-jdk \
    # Python runtime
    python3 \
    python3-pip \
    # System utilities
    time \
    coreutils \
    procps \
    psmisc \
    # Security tools
    seccomp \
    # Clean up
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set Java environment
ENV JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64

# Create executor user with minimal privileges
RUN useradd -m -s /bin/bash -u 1001 executor && \
    # Remove sudo access
    deluser executor sudo 2>/dev/null || true && \
    # Create secure working directory
    mkdir -p /tmp/execution && \
    chown executor:executor /tmp/execution && \
    chmod 755 /tmp/execution

# Set resource limits in limits.conf
RUN echo "executor soft nproc 64" >> /etc/security/limits.conf && \
    echo "executor hard nproc 128" >> /etc/security/limits.conf && \
    echo "executor soft nofile 256" >> /etc/security/limits.conf && \
    echo "executor hard nofile 512" >> /etc/security/limits.conf

# Create seccomp profile for security
COPY seccomp-profile.json /etc/seccomp-profile.json

# Set working directory
WORKDIR /tmp/execution

# Copy execution script
COPY execute.sh /usr/local/bin/execute.sh
RUN chmod +x /usr/local/bin/execute.sh

# Switch to executor user
USER executor

# Set default command
CMD ["/bin/bash"]