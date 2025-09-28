#!/bin/bash

# Development setup script

echo "Setting up development environment..."

# Copy environment file
if [ ! -f .env ]; then
    cp .env.example .env
    echo "Created .env file from .env.example"
    echo "Please edit .env file with your actual values"
fi

# Install frontend dependencies
echo "Installing frontend dependencies..."
npm install

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
go mod tidy
cd ..

echo "Development setup complete!"
echo ""
echo "To run the application:"
echo "1. Start backend: cd backend && go run main.go"
echo "2. Start frontend: npm run dev"
echo ""
echo "Or use Docker:"
echo "docker-compose up --build"