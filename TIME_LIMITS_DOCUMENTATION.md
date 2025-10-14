# Time Limit Multipliers Configuration

## Overview
Different programming languages have different execution speeds. To ensure fairness, our platform applies language-specific time multipliers to problem time limits.

## Current Configuration

| Language | Multiplier | Example (5000ms base) | Notes |
|----------|------------|----------------------|-------|
| **C++**    | 1.0x       | 5,000ms              | Fastest compiled language (baseline) |
| **Java**   | 2.0x       | 10,000ms             | JVM startup overhead + slower than C++ |
| **Python** | 3.0x       | 15,000ms             | Interpreted language, slower execution |

## How It Works

### Example: Two Sum Problem
- **Base Time Limit**: 5000ms (defined in problem settings)

### Applied Time Limits:
- **C++ solution**: Gets 5000ms (5000 × 1.0)
- **Java solution**: Gets 10000ms (5000 × 2.0)
- **Python solution**: Gets 15000ms (5000 × 3.0)

### Code Location
The multipliers are configured in:
```
backend/src/config/languages.json
```

Applied during execution in:
```javascript
// backend/src/services/multiLangExecutor.js:370-371
const adjustedTimeLimit = timeLimit * config.timeMultiplier;
const adjustedMemoryLimit = memoryLimit * config.memoryLimit;
```

## Comparison with Major Platforms

| Platform    | Python Multiplier | Notes |
|-------------|-------------------|-------|
| LeetCode    | ~3.0x             | Python3 gets 3x C++ time |
| Codeforces  | 2.0-5.0x          | Varies by problem |
| HackerRank  | ~3.0x             | Python gets 3x |
| **Our Platform** | **3.0x**     | Balanced approach ✓ |

## Memory Multipliers

Memory limits are also adjusted:

| Language | Memory Multiplier | Example (256MB base) |
|----------|-------------------|---------------------|
| C++      | 1.0x              | 256MB               |
| Java     | 2.0x              | 512MB               |
| Python   | 1.5x              | 384MB               |

## Adjusting Multipliers

To modify multipliers, edit `backend/src/config/languages.json`:

```json
{
  "python": {
    "timeMultiplier": 3.0,    // Change this value
    "memoryMultiplier": 1.5   // Change this value
  }
}
```

**Note**: Restart the backend server after making changes.

## Testing Multipliers

Run this command to verify current configuration:

```bash
cd backend
node -e "const config = require('./src/config/languages.json'); Object.entries(config).forEach(([lang, c]) => { if (c.timeMultiplier) console.log(lang + ': ' + c.timeMultiplier + 'x'); });"
```

## Best Practices

1. **Don't set multipliers too high**: Python with 5x+ can mask inefficient algorithms
2. **Test across languages**: Ensure your test cases work for all language multipliers
3. **Document problem constraints**: Clearly state base time limits in problem descriptions
4. **Monitor submissions**: Watch for patterns where one language consistently times out

## Example Submission Flow

### User submits Python Two Sum solution:
1. Problem has base time limit: **5000ms**
2. System loads language config: `python.timeMultiplier = 3.0`
3. Adjusted time limit: **15000ms** (5000 × 3.0)
4. Code executes with 15000ms timeout
5. Result:
   - ✅ Execution time: 12ms → **Accepted**
   - ❌ Execution time: 16000ms → **Time Limit Exceeded**

## Troubleshooting

### "All Python solutions are timing out!"
- Check if multiplier is too low
- Consider increasing from 3.0x to 3.5x or 4.0x

### "Python solutions pass with O(n²) algorithms"
- Multiplier might be too high
- Consider reducing to 2.5x or adjusting test case sizes

### "Java solutions fail to run at all"
- Check JVM startup time (included in execution time)
- May need to increase multiplier to 2.5x

## Related Files

- `backend/src/config/languages.json` - Configuration
- `backend/src/services/multiLangExecutor.js` - Execution logic
- `backend/src/services/judgeEngine.js` - Verdict determination

---

**Last Updated**: 2025-01-13
**Current Multipliers**: C++ 1.0x | Java 2.0x | Python 3.0x
