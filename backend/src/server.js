import 'dotenv/config';
import app from './app.js';

const PORT = process.env.PORT || 3000;

// Start the server: from now on it accepts requests on that port
app.listen(PORT, () => {
  console.log(`Backend listening on the port ${PORT}`);
});