FROM node

# Create app directory
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install

# Copy the rest of the app's source code
COPY . .

# Expose the port the app runs in
CMD [ "node", "main.js" ]