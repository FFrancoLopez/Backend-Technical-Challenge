import app from './app.js';
import { getConfig } from './config/env.js';

const { port } = getConfig();

app.listen(port, () => {
  console.log(`Payment Flow API running on port ${port}`);
});