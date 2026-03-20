import dotenv from 'dotenv';
// Optional: Load environment variables from a .env file
dotenv.config();

const config = {
  server: {
    port: 8000,
    url: 'http://localhost:8000/',
  },
};

export default config;
