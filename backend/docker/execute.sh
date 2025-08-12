#!/bin/bash
# CS Club Hackathon Platform - Code Execution Script
# Phase 1.3: Language-specific execution with security and resource monitoring

set -e

# Configuration
TIME_LIMIT=5  # Default time limit in seconds
MEMORY_LIMIT=256  # Memory limit in MB
MAX_OUTPUT_SIZE=10485760  # 10MB output limit

# Function to log execution details
log_execution() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >&2
}

# Function to cleanup files
cleanup() {
    cd /tmp/execution
    rm -f solution.* Solution.* input.txt output.txt error.txt
    log_execution "Cleaned up execution files"
}

# Function to run with timeout and resource monitoring
run_with_limits() {
    local cmd="$1"
    local time_limit="$2"
    local memory_limit_kb=$((MEMORY_LIMIT * 1024))
    
    # Use timeout and ulimit for resource control
    timeout --preserve-status "${time_limit}s" \
        bash -c "
            ulimit -v $memory_limit_kb
            ulimit -f 20480  # 20MB file size limit
            ulimit -u 64     # Process limit
            $cmd
        " 2>error.txt
    
    return $?
}

# Function to get file size in bytes
get_file_size() {
    if [ -f "$1" ]; then
        stat -f%z "$1" 2>/dev/null || stat -c%s "$1" 2>/dev/null || echo "0"
    else
        echo "0"
    fi
}

# Main execution logic
main() {
    if [ $# -lt 3 ]; then
        echo "Usage: $0 <language> <time_limit> <memory_limit> [input_file]"
        exit 1
    fi
    
    local language="$1"
    local time_limit="$2"
    local memory_limit="$3"
    local input_file="${4:-input.txt}"
    
    # Update limits
    TIME_LIMIT="$time_limit"
    MEMORY_LIMIT="$memory_limit"
    
    log_execution "Starting execution: Language=$language, TimeLimit=${time_limit}s, MemoryLimit=${memory_limit}MB"
    
    # Ensure we're in the execution directory
    cd /tmp/execution
    
    # Set trap for cleanup
    trap cleanup EXIT
    
    # Create input file if provided
    if [ "$input_file" != "input.txt" ] && [ -f "$input_file" ]; then
        cp "$input_file" input.txt
    fi
    
    local start_time=$(date +%s.%N)
    local compile_time=0
    local execution_time=0
    local exit_code=0
    local verdict="AC"  # Accepted
    
    case "$language" in
        "cpp"|"c++")
            log_execution "Compiling C++ code"
            local compile_start=$(date +%s.%N)
            
            if run_with_limits "g++ -O2 -std=c++17 -static -o solution solution.cpp" 30; then
                compile_time=$(echo "$(date +%s.%N) - $compile_start" | bc -l 2>/dev/null || echo "0")
                log_execution "C++ compilation successful (${compile_time}s)"
                
                log_execution "Executing C++ solution"
                local exec_start=$(date +%s.%N)
                
                if [ -f input.txt ]; then
                    run_with_limits "./solution < input.txt > output.txt" "$time_limit"
                else
                    run_with_limits "./solution > output.txt" "$time_limit"
                fi
                exit_code=$?
                
                execution_time=$(echo "$(date +%s.%N) - $exec_start" | bc -l 2>/dev/null || echo "0")
            else
                exit_code=1
                verdict="CE"  # Compilation Error
                log_execution "C++ compilation failed"
                cat error.txt > output.txt 2>/dev/null || echo "Compilation failed" > output.txt
            fi
            ;;
            
        "java")
            log_execution "Compiling Java code"
            local compile_start=$(date +%s.%N)
            
            if run_with_limits "javac Solution.java" 30; then
                compile_time=$(echo "$(date +%s.%N) - $compile_start" | bc -l 2>/dev/null || echo "0")
                log_execution "Java compilation successful (${compile_time}s)"
                
                log_execution "Executing Java solution"
                local exec_start=$(date +%s.%N)
                local java_time_limit=$(echo "$time_limit * 2" | bc -l)  # Java time multiplier: 2.0x
                
                if [ -f input.txt ]; then
                    run_with_limits "java Solution < input.txt > output.txt" "$java_time_limit"
                else
                    run_with_limits "java Solution > output.txt" "$java_time_limit"
                fi
                exit_code=$?
                
                execution_time=$(echo "$(date +%s.%N) - $exec_start" | bc -l 2>/dev/null || echo "0")
                # Adjust execution time for reporting (divide by multiplier)
                execution_time=$(echo "$execution_time / 2" | bc -l 2>/dev/null || echo "$execution_time")
            else
                exit_code=1
                verdict="CE"  # Compilation Error
                log_execution "Java compilation failed"
                cat error.txt > output.txt 2>/dev/null || echo "Compilation failed" > output.txt
            fi
            ;;
            
        "python"|"py")
            log_execution "Executing Python solution"
            local exec_start=$(date +%s.%N)
            local python_time_limit=$(echo "$time_limit * 5" | bc -l)  # Python time multiplier: 5.0x
            
            # Check for syntax errors first
            if python3 -m py_compile solution.py 2>error.txt; then
                if [ -f input.txt ]; then
                    run_with_limits "python3 solution.py < input.txt > output.txt" "$python_time_limit"
                else
                    run_with_limits "python3 solution.py > output.txt" "$python_time_limit"
                fi
                exit_code=$?
                
                execution_time=$(echo "$(date +%s.%N) - $exec_start" | bc -l 2>/dev/null || echo "0")
                # Adjust execution time for reporting (divide by multiplier)
                execution_time=$(echo "$execution_time / 5" | bc -l 2>/dev/null || echo "$execution_time")
            else
                exit_code=1
                verdict="CE"  # Compilation Error (syntax error)
                log_execution "Python syntax check failed"
                cat error.txt > output.txt 2>/dev/null || echo "Syntax error" > output.txt
            fi
            ;;
            
        *)
            echo "Unsupported language: $language"
            exit 1
            ;;
    esac
    
    local total_time=$(echo "$(date +%s.%N) - $start_time" | bc -l 2>/dev/null || echo "0")
    
    # Determine verdict based on exit code
    if [ "$verdict" != "CE" ]; then
        case $exit_code in
            0)
                verdict="AC"  # Accepted
                ;;
            124|143)  # timeout or SIGTERM
                verdict="TLE"  # Time Limit Exceeded
                ;;
            137)  # SIGKILL (memory limit)
                verdict="MLE"  # Memory Limit Exceeded
                ;;
            *)
                verdict="RTE"  # Runtime Error
                ;;
        esac
    fi
    
    # Check output size
    local output_size=$(get_file_size "output.txt")
    if [ "$output_size" -gt "$MAX_OUTPUT_SIZE" ]; then
        echo "Output size exceeded limit" > output.txt
        verdict="RTE"
    fi
    
    # Log execution results
    log_execution "Execution completed: Verdict=$verdict, ExitCode=$exit_code"
    log_execution "Times: Compile=${compile_time}s, Execute=${execution_time}s, Total=${total_time}s"
    
    # Output results in JSON format
    echo "{"
    echo "  \"verdict\": \"$verdict\","
    echo "  \"exitCode\": $exit_code,"
    echo "  \"compileTime\": $compile_time,"
    echo "  \"executionTime\": $execution_time,"
    echo "  \"totalTime\": $total_time,"
    echo "  \"outputSize\": $output_size"
    echo "}"
    
    # Ensure output file exists
    touch output.txt
    
    exit $exit_code
}

# Run main function
main "$@"