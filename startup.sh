#!/bin/bash
# Azure Linux startup script

echo "Starting FreshGrad Tracker..."
cd /home/site/wwwroot
npm install --production
node server.cjs
