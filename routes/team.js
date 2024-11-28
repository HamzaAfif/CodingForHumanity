const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const db = new sqlite3.Database('./laBD.db');

const upload = multer({
  dest: path.join(__dirname, '../public/uploads/team'),
});

router.post('/add-member', upload.single('image'), (req, res) => {
  const { name, role } = req.body;
  const imagePath = `/uploads/team/${req.file.filename}`;

  db.run(
    'INSERT INTO team (name, role, image_path) VALUES (?, ?, ?)',
    [name, role, imagePath],
    (err) => {
      if (err) {
        console.error(err.message);
        return res.status(500).send('Error adding team member.');
      }
      res.redirect('/manageAsspa');
    }
  );
});

router.post('/update-member', upload.single('image'), (req, res) => {
  const { id, name, role } = req.body;
  const imagePath = req.file ? `/uploads/team/${req.file.filename}` : null;

  db.run(
    'UPDATE team SET name = ?, role = ?, image_path = COALESCE(?, image_path) WHERE id = ?',
    [name, role, imagePath, id],
    (err) => {
      if (err) {
        console.error(err.message);
        return res.status(500).send('Error updating team member.');
      }
      res.redirect('/manageAsspa');
    }
  );
});

router.post('/delete-member', (req, res) => {
  const { id } = req.body;

  db.get('SELECT image_path FROM team WHERE id = ?', [id], (err, member) => {
    if (err) {
      console.error(err.message);
      return res.status(500).send('Error finding team member.');
    }

    if (member && member.image_path) {
      fs.unlink(path.join(__dirname, '../public', member.image_path), (err) => {
        if (err) console.error(err.message);
      });
    }

    db.run('DELETE FROM team WHERE id = ?', [id], (err) => {
      if (err) {
        console.error(err.message);
        return res.status(500).send('Error deleting team member.');
      }
      res.redirect('/manageAsspa');
    });
  });
});

module.exports = router;
