FROM node

# 复制 package.json 并安装依赖
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install

# 复制应用代码
COPY . .

EXPOSE 3001

# 启动应用
CMD [ "node", "main.js" ]