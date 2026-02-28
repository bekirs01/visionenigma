FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Railway build args for NEXT_PUBLIC_ variables
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL

# Build the app
RUN npm run build

# Railway provides PORT env variable
ENV PORT=3000
EXPOSE 3000

CMD ["npm", "run", "start"]
