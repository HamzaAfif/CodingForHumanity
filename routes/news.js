const express = require('express');
const multer = require('multer');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');


const router = express.Router();
const db = new sqlite3.Database('./laBD.db');


const upload = multer({
  dest: path.join(__dirname, '../public/uploads'), // Save uploaded files to this folder
});


router.post('/add-news', upload.array('images', 10), (req, res) => {
    const { date, title, description, tags, full_text } = req.body;
  
    if (!date || !title || !description || !full_text) {
      return res.status(400).send('Required fields are missing.');
    }
  
    db.run(
      'INSERT INTO news (date, title, description, tags, full_text) VALUES (?, ?, ?, ?, ?)',
      [date, title, description, tags || null, full_text],
      function (err) {
        if (err) {
          console.error(err.message);
          return res.status(500).send('Error adding news.');
        }
  
        const newsId = this.lastID;
  
        // Handle multiple image uploads
        const images = req.files.map((file) => [`/uploads/${file.filename}`, newsId]);
  
        if (images.length > 0) {
          const placeholders = images.map(() => '(?, ?)').join(',');
          const query = `INSERT INTO news_images (image_path, news_id) VALUES ${placeholders}`;
  
          db.run(query, images.flat(), (err) => {
            if (err) {
              console.error(err.message);
              return res.status(500).send('Error saving images.');
            }
            res.redirect('/manageAsspa');
          });
        } else {
          res.redirect('/manageAsspa');
        }
      }
    );
  });
  
  router.post('/delete-image', (req, res) => {
    const { image_id } = req.body;
  
    // Get image path to delete from filesystem
    db.get(`SELECT image_path FROM images WHERE id = ?`, [image_id], (err, row) => {
      if (err) {
        console.error(err.message);
        return res.status(500).send('Error fetching image.');
      }
  
      if (row) {
        const filePath = path.join(__dirname, '../public', row.image_path);
  
        // Delete image file from filesystem
        fs.unlink(filePath, unlinkErr => {
          if (unlinkErr) {
            console.error('Error deleting file:', unlinkErr.message);
          }
  
          // Delete image record from database
          db.run(`DELETE FROM images WHERE id = ?`, [image_id], dbErr => {
            if (dbErr) {
              console.error('Error deleting image from database:', dbErr.message);
              return res.status(500).send('Error deleting image.');
            }
  
            res.redirect('/manageAsspa');
          });
        });
      } else {
        res.status(404).send('Image not found.');
      }
    });
  });
  

  
// Route: Delete News
router.post('/delete-news', (req, res) => {
  const { id } = req.body;

  db.get('SELECT image_path FROM news WHERE id = ?', [id], (err, row) => {
    if (err || !row) {
      console.error('Error finding news:', err);
      return res.status(500).send('Error deleting news.');
    }

    if (row.image_path) {
      const fs = require('fs');
      const imagePath = path.join(__dirname, '../public', row.image_path);

      // Delete the image file
      fs.unlink(imagePath, (unlinkErr) => {
        if (unlinkErr) console.error('Error deleting file:', unlinkErr);
      });
    }

    db.run('DELETE FROM news WHERE id = ?', [id], (err) => {
      if (err) {
        console.error(err.message);
        return res.status(500).send('Error deleting news.');
      }
      res.redirect('/manageAsspa');
    });
  });
});


router.post('/update-news', upload.array('images', 10), (req, res) => {
    const { id, date, title, description, full_text, tags, delete_images } = req.body;
  
    try {
      // Handle image deletion
      if (delete_images) {
        const imagesToDelete = Array.isArray(delete_images) ? delete_images : [delete_images];
        imagesToDelete.forEach(imageId => {
          db.get('SELECT image_path FROM news_images WHERE id = ?', [imageId], (err, row) => {
            if (!err && row) {
              fs.unlink(`./public${row.image_path}`, unlinkErr => {
                if (unlinkErr) console.error('Error deleting image file:', unlinkErr);
              });
            }
          });
          db.run('DELETE FROM news_images WHERE id = ?', [imageId]);
        });
      }
  
      // Insert new images if uploaded
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          db.run('INSERT INTO news_images (news_id, image_path) VALUES (?, ?)', [id, `/uploads/${file.filename}`]);
        });
      }
  
      // Update only the fields provided (without touching the images)
      db.run(
        'UPDATE news SET date = ?, title = ?, description = ?, full_text = ?, tags = ? WHERE id = ?',
        [date, title, description, full_text, tags, id],
        (err) => {
          if (err) {
            console.error('Error updating news:', err);
            return res.status(500).send('Error updating news.');
          }
          res.redirect('/manageAsspa');
        }
      );
    } catch (error) {
      console.error('Error processing update:', error);
      res.status(500).send('Internal server error.');
    }
  });
  

  

router.post('/change-status', (req, res) => {
    const { id, status } = req.body;
  
    if (!id || !status) {
      console.error('ID and status are required.');
      return res.status(400).send('ID and status are required.');
    }
  
    db.run('UPDATE news SET status = ? WHERE id = ?', [status, id], (err) => {
      if (err) {
        console.error('Error updating article status:', err.message);
        return res.status(500).send('Error updating article status.');
      }
      res.redirect('/manageAsspa');
    });
  });




router.get('/:id', (req, res) => {
const { id } = req.params;

db.get('SELECT * FROM news WHERE ID = ?', [id], (err, article) => {
    if (err) {
    console.error(err.message);
    return res.status(500).send('Error loading article.');
    }
    if (!article) {
    return res.status(404).send('Article not found.');
    }

    res.render('pages/news-details', { article });
});
});

  
module.exports = router;
