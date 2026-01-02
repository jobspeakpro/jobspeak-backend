import re

# Read the file
with open('routes/mockInterview.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the escaped quotes
content = content.replace(r'\"', '"')

# Write back
with open('routes/mockInterview.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Fixed escaped quotes in mockInterview.js")
