import express from 'express'
import path from 'path'

const app = express()
const __dirname = path.resolve();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
// app.use(express.static(path.join(__dirname + '/app', 'public')));
// app.use(express.json());

// Define view directory for this specific module
// const viewsDir = path.join(__dirname, '..', 'views');

import programRouter from './program.ts'
app.use(programRouter)

export default app;