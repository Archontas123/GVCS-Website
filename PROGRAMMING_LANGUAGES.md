# Programming Language Support

The CS Club Hackathon Platform supports **real code execution** for three programming languages with actual compilers/interpreters.

## Supported Languages

### 1. Python 3.x ✅
- **Execution**: Direct interpretation with `python3`
- **File Extension**: `.py`
- **Time Multiplier**: 5.0x (slower than compiled languages)
- **Memory Multiplier**: 1.5x
- **Status**: ✅ **Working** - No compilation required

**Example Code:**
```python
# Read input and solve
a, b = map(int, input().split())
print(a + b)
```

### 2. C++ ✅
- **Compilation**: Real compilation with `g++` (MinGW on Windows)
- **Execution**: Native binary execution
- **File Extension**: `.cpp`
- **Compiler Flags**: `-O2 -std=c++17`
- **Time Multiplier**: 1.0x (baseline performance)
- **Memory Multiplier**: 1.0x
- **Status**: ✅ **Working** - Requires g++ compiler

**Example Code:**
```cpp
#include <iostream>
using namespace std;

int main() {
    int a, b;
    cin >> a >> b;
    cout << a + b << endl;
    return 0;
}
```

### 3. Java ✅
- **Compilation**: Real compilation with `javac`
- **Execution**: JVM execution with `java`
- **File Extension**: `.java`
- **Class Name**: Must be `Solution`
- **Time Multiplier**: 2.0x (JVM overhead)
- **Memory Multiplier**: 2.0x (JVM memory usage)
- **Status**: ✅ **Working** - Requires JDK with javac

**Example Code:**
```java
import java.util.Scanner;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int a = sc.nextInt();
        int b = sc.nextInt();
        System.out.println(a + b);
        sc.close();
    }
}
```

## Installation Requirements

### Windows (Automated Setup)
Run the setup script to install all compilers:
```powershell
cd scripts
.\setup-windows.ps1
```

### Windows (Manual Installation)
```powershell
choco install mingw openjdk python -y
```

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install build-essential default-jdk python3
```

### macOS
```bash
# Install Xcode Command Line Tools
xcode-select --install

# Install Java
brew install openjdk

# Python usually comes pre-installed
```

## Execution Flow

### 1. Code Submission
1. User submits code via frontend
2. API validates code and language
3. Code sent to `multiLangExecutor` service

### 2. Compilation (C++/Java only)
1. Source code written to temporary file
2. Compiler executed with proper flags
3. Compilation errors caught and returned to user
4. Compiled binary/bytecode prepared for execution

### 3. Execution
1. Program executed with test case input via STDIN
2. Program output captured from STDOUT
3. Execution time and memory usage monitored
4. Runtime errors caught and reported

### 4. Verdict Determination
- **Accepted**: Output matches expected, no errors
- **Wrong Answer**: Output doesn't match expected
- **Compilation Error**: Code failed to compile
- **Runtime Error**: Program crashed during execution
- **Time Limit Exceeded**: Program took too long
- **Memory Limit Exceeded**: Program used too much memory

## Time and Memory Limits

The system applies different multipliers based on language characteristics:

| Language | Time Multiplier | Memory Multiplier | Reason |
|----------|----------------|-------------------|---------|
| C++ | 1.0x | 1.0x | Baseline (fastest) |
| Java | 2.0x | 2.0x | JVM overhead |
| Python | 5.0x | 1.5x | Interpreted language |

**Example**: If a problem has 1000ms time limit:
- C++: 1000ms actual limit
- Java: 2000ms actual limit  
- Python: 5000ms actual limit

## Error Handling

### Compilation Errors
- **C++**: g++ compiler messages returned to user
- **Java**: javac compiler messages returned to user
- **Python**: No compilation (syntax errors caught at runtime)

### Runtime Errors
- **All Languages**: Error messages and stack traces returned
- **Exit Code**: Non-zero exit codes detected as runtime errors
- **Timeouts**: Processes killed after time limit exceeded

## Security Features

1. **Temporary Files**: Each execution uses unique temporary directory
2. **Process Isolation**: Each program runs in separate process
3. **Resource Limits**: Memory and time limits enforced
4. **Cleanup**: Temporary files cleaned after execution
5. **No Network**: Programs cannot access network resources

## Testing Your Setup

Run this test to verify all languages work:

```bash
node test-languages.js
```

Or test individual languages:
```bash
# Test Python
curl -X POST http://localhost:3000/api/execute/test \
  -H "Content-Type: application/json" \
  -d '{"language":"python","code":"print(\"Hello Python\")","input":""}'

# Test C++  
curl -X POST http://localhost:3000/api/execute/test \
  -H "Content-Type: application/json" \
  -d '{"language":"cpp","code":"#include<iostream>\nusing namespace std;\nint main(){cout<<\"Hello C++\"<<endl;return 0;}","input":""}'

# Test Java
curl -X POST http://localhost:3000/api/execute/test \
  -H "Content-Type: application/json" \
  -d '{"language":"java","code":"public class Solution{public static void main(String[] args){System.out.println(\"Hello Java\");}}","input":""}'
```

## Troubleshooting

### "spawn g++ ENOENT" Error
- **Problem**: g++ compiler not installed or not in PATH
- **Solution**: Install MinGW on Windows or build-essential on Linux

### "spawn javac ENOENT" Error  
- **Problem**: Java compiler not installed or not in PATH
- **Solution**: Install JDK (OpenJDK recommended)

### Python Works But C++/Java Don't
- **Problem**: Only Python is installed by default on most systems
- **Solution**: Use our Windows setup script or manually install compilers

### Compilation Succeeds But Execution Fails
- **Problem**: Runtime environment issue
- **Solution**: Check system PATH and verify compiler installation

## Performance Tips

1. **Use C++** for performance-critical problems
2. **Use Java** for object-oriented solutions with moderate performance needs
3. **Use Python** for rapid prototyping and algorithm implementation
4. **Optimize I/O** in all languages for faster execution
5. **Avoid recursion** in Python for deep recursive problems (use iteration)

## Language-Specific Notes

### C++
- Always include `#include <iostream>` for I/O
- Use `using namespace std;` for convenience
- Prefer `cin/cout` over `scanf/printf` for simplicity
- Standard library algorithms available (`#include <algorithm>`)

### Java
- Main class MUST be named `Solution`
- Use `Scanner` for input parsing
- Memory usage is higher due to JVM
- Automatic garbage collection

### Python
- Use `input().split()` for reading multiple values
- `map(int, input().split())` for integer parsing
- List comprehensions for efficient operations
- Be careful with floating-point precision

---

**Note**: This system uses **real code execution** with actual compilers and interpreters. No mocking or simulation is involved - your code runs exactly as it would on a competitive programming judge!