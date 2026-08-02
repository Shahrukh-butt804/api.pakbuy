# !/bin/bash

# run the following command to make the script executable in the project directory on cPanel
# chmod +x deploy.sh

echo "Starting deployment..."

echo "Restore all the changes in the working directory..."
git restore .
git clean -f

echo "Pulling changes from GitLab..."
git pull origin main

echo "Installing dependencies..."
npm install

echo "Resurrect..."
pm2 resurrect

echo "Create build..."
npm run build

echo "Restarting the Node.js app with PM2..."
pm2 restart pakbuy

echo "Logging..."
pm2 log pakbuy

echo "Deployment complete!"
