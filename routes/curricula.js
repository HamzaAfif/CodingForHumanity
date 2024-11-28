const express = require('express');
const multer = require('multer');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const router = express.Router();
const db = new sqlite3.Database('./laBD.db');


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/uploads')); 
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});
const upload = multer({ storage });


router.post('/add', upload.single('logo'), (req, res) => {
  const { title, description, category } = req.body;
  const logoPath = req.file ? `/uploads/${req.file.filename}` : null;

  db.run(
    'INSERT INTO curricula (title, description, category, logo_path) VALUES (?, ?, ?, ?)',
    [title, description, category, logoPath],
    (err) => {
      if (err) {
        console.error('Error adding curriculum:', err.message);
        return res.status(500).send('Error adding curriculum.');
      }
      res.redirect('/manageAsspa');
    }
  );
});

router.post('/delete', (req, res) => {
    const { id } = req.body; 
  
    if (!id) {
      return res.status(400).send('Missing curriculum ID.');
    }
  
    db.run('DELETE FROM curricula WHERE id = ?', [id], (err) => {
      if (err) {
        console.error('Error deleting curriculum:', err.message);
        return res.status(500).send('Error deleting curriculum.');
      }
  
      res.redirect('/manageAsspa'); 
    });
  });
  

module.exports = router;
