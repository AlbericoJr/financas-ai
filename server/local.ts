import app from './app.ts';
app.listen(Number(process.env.PORT)||3000,()=>console.log('API Finanças AI iniciada.'));
