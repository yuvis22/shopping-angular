#!/bin/bash

# Script to create .env file from template

if [ -f ".env" ]; then
    echo "⚠️  .env file already exists!"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Setup cancelled. Existing .env file preserved."
        exit 1
    fi
fi

cp env.template .env
echo "✅ Created .env file from template"
echo ""
echo "📝 Next steps:"
echo "1. Edit .env file with your actual credentials:"
echo "   - MongoDB connection string"
echo "   - Clerk secret key"
echo "   - Backblaze B2 credentials"
echo ""
echo "2. Run: npm install"
echo "3. Run: npm run dev"

