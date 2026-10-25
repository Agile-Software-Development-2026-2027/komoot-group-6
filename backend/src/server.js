import 'dotenv/config';
import app from './app.js';

const PORT = process.env.PORT || 3000;

// Avvia il server: da questo momento in poi accetta richieste su quella porta
app.listen(PORT, () => {
  console.log(`Backend listening on the port ${PORT}`);
});