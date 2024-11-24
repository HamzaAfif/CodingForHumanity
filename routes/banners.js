const express = require('express');
const multer = require('multer');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const router = express.Router();
const db = new sqlite3.Database('./laBD.db');

// Set up multer for file uploads
const upload = multer({
  dest: path.join(__dirname, '../public/uploads'), // Save uploaded files to this folder
});




router.post('/add-banner', upload.single('banner'), (req, res) => {
  const imagePath = `/uploads/${req.file.filename}`;

  db.run('INSERT INTO banners (image_path) VALUES (?)', [imagePath], (err) => {
    if (err) {
      console.error(err.message);
      return res.status(500).send('Error saving banner.');
    }
    res.redirect('/manageAsspa');
  });
});


router.post('/delete-banner', (req, res) => {
  const { id } = req.body;

  db.get('SELECT image_path FROM banners WHERE id = ?', [id], (err, banner) => {
    if (err || !banner) {
      console.error(err ? err.message : 'Banner not found');
      return res.status(500).send('Error deleting banner.');
    }

    const filePath = path.join(__dirname, '../public', banner.image_path);

    fs.unlink(filePath, (unlinkErr) => {
      if (unlinkErr) console.error(unlinkErr);

      db.run('DELETE FROM banners WHERE id = ?', [id], (dbErr) => {
        if (dbErr) {
          console.error(dbErr.message);
          return res.status(500).send('Error deleting banner.');
        }
        res.redirect('/manageAsspa');
      });
    });
  });
});

module.exports = router;
