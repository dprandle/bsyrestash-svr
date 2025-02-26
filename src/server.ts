import express from "express";
import path from "path";
const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname,'../public')));

// This request isnt needed because the index.html is already being served by the express.static middleware
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

app.listen(port, () => {
    return console.log(`Express is listening at http://localhost:${port}`);
});
