import serverless from 'serverless-http';
import { app } from '../apps/api/dist/app.js';

export default serverless(app);
