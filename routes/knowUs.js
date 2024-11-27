const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');

const db = new sqlite3.Database('./laBD.db');

// Multer setup for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});
const upload = multer({ storage });


router.post('/update', upload.single('image'), (req, res) => {
    const { content, tagline } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
  
    // Check if any row exists in the table
    db.get('SELECT * FROM know_us LIMIT 1', (err, row) => {
      if (err) {
        console.error('Error querying "Know Us" table:', err.message);
        return res.status(500).send('Error updating the "Know Us" section.');
      }
  
      if (row) {
        // If row exists, update it
        db.run(
          `UPDATE know_us SET content = ?, tagline = ?, image_path = COALESCE(?, image_path) WHERE id = ?`,
          [content, tagline, imagePath, row.id],
          (err) => {
            if (err) {
              console.error('Error updating "Know Us" section:', err.message);
              return res.status(500).send('Error updating the "Know Us" section.');
            }
            console.log('Know Us section updated successfully!');
            res.redirect('/manageAsspa');
          }
        );
      } else {
        // If no row exists, insert one
        db.run(
          `INSERT INTO know_us (content, tagline, image_path) VALUES (?, ?, ?)`,
          [content, tagline, imagePath],
          (err) => {
            if (err) {
              console.error('Error inserting into "Know Us" section:', err.message);
              return res.status(500).send('Error updating the "Know Us" section.');
            }
            console.log('Know Us section created successfully!');
            res.redirect('/manageAsspa');
          }
        );
      }
    });
  });
  
  

module.exports = router;
