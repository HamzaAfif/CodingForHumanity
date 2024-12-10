const express = require('express');
const bcrypt = require('bcrypt');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;
const db = new sqlite3.Database('./laBD.db');


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true })); // Parse form data
app.use(session({
    secret: 'your_secret_key', // Change this to a secure key
    resave: false,
    saveUninitialized: false,
}));
app.use(express.static(path.join(__dirname, 'public')));

const bannerRoutes = require('./routes/banners');

app.use('/manageAsspa', bannerRoutes);

const newsRoutes = require('./routes/news');
app.use('/news', newsRoutes);

const teamRoutes = require('./routes/team');
app.use('/team', teamRoutes);

const curriculaRoutes = require('./routes/curricula'); 

app.use('/curricula', curriculaRoutes);


const knowUsRoutes = require('./routes/knowUs');
app.use('/know-us', knowUsRoutes);

app.get('/', (req, res) => {
  db.all('SELECT * FROM banners', (err, banners) => {
    if (err) {
      console.error(err.message);
      return res.status(500).send('Error loading banners.');
    }

    db.all('SELECT * FROM news', (err, news) => {
      if (err) {
        console.error(err.message);
        return res.status(500).send('Error loading news.');
      }

      news.sort((a, b) => new Date(b.date) - new Date(a.date));

      db.all('SELECT * FROM news_images', (err, images) => {
        if (err) {
          console.error(err.message);
          return res.status(500).send('Error loading images.');
        }

        const imagesByNews = images.reduce((acc, img) => {
          acc[img.news_id] = acc[img.news_id] || [];
          acc[img.news_id].push(img.image_path);
          return acc;
        }, {});

        news.forEach((article) => {
          article.images = imagesByNews[article.ID] || [];
        });

        db.all('SELECT * FROM team', (err, team) => {
          if (err) {
            console.error(err.message);
            return res.status(500).send('Error loading team.');
          }

          db.get('SELECT * FROM know_us LIMIT 1', (err, knowUs) => {
            if (err) {
              console.error(err.message);
              return res.status(500).send('Error loading Know Us content.');
            }

            res.render('pages/home', {
              banners: banners || [],
              news: news || [],
              team: team || [],
              knowUs: knowUs || { content: '', tagline: '', image_path: '' },
            });

            console.log('dkhl chi wahd');
          });
        });
      });
    });
  });
});


app.get('/know-us', (req, res) => {
  res.render('pages/know-us');
});

app.get('/register', (req, res) => {
  res.render('pages/register');
});


app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], (err) => {
    if (err) {
      console.error(err.message);
      return res.send('User already exists. <a href="/register">Try again</a>.');
    }
    res.redirect('/login');
  });
});


app.get('/login', (req, res) => {
  res.render('pages/login');
});


app.post('/login', (req, res) => {
  const { username, password } = req.body;

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      console.error(err.message);
      return res.status(500).send('Internal server error.');
    }
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.send('Invalid username or password. <a href="/login">Try again</a>.');
    }

    req.session.userId = user.id;
    req.session.username = user.username;
    res.redirect('/manageAsspa');
  });
});



app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err.message);
      return res.status(500).send('Error logging out.');
    }
    res.redirect('/');
  });
});


app.get('/manageAsspa', (req, res) => {
  if (req.session.userId) {

    db.all('SELECT * FROM banners', (err, banners) => {
      if (err) {
        console.error('Error fetching banners:', err.message);
        return res.status(500).send('Error loading banners.');
      }

      db.all('SELECT * FROM news', (err, news) => {
        if (err) {
          console.error('Error fetching news:', err.message);
          return res.status(500).send('Error loading news.');
        }

        const articlePromises = news.map((article) => {
          return new Promise((resolve, reject) => {
            db.all('SELECT image_path, id FROM news_images WHERE news_id = ?', [article.ID], (err, images) => {
              if (err) reject(err);
              article.images = images || []; 
              resolve(article);
            });
          });
        });

        Promise.all(articlePromises).then((articles) => {

          db.all('SELECT * FROM team', (err, team) => {
            if (err) {
              console.error('Error fetching team:', err.message);
              return res.status(500).send('Error loading team members.');
            }


            db.get('SELECT * FROM know_us LIMIT 1', (err, knowUs) => {
              if (err) {
                console.error('Error fetching Know Us section:', err.message);
                return res.status(500).send('Error loading Know Us content.');
              }


              db.all('SELECT * FROM registrations ORDER BY created_at DESC', (err, registrations) => {
                if (err) {
                  console.error('Error fetching registrations:', err.message);
                  return res.status(500).send('Error loading registrations.');
                }

       
                db.all('SELECT * FROM curricula', (err, curricula) => {
                  if (err) {
                    console.error('Error fetching curricula:', err.message);
                    return res.status(500).send('Error loading curricula.');
                  }

            
                  db.all('SELECT * FROM albums', (err, albums) => {
                    if (err) {
                      console.error('Error fetching albums:', err.message);
                      return res.status(500).send('Error loading albums.');
                    }

                    const albumPromises = albums.map((album) => {
                      return new Promise((resolve, reject) => {
                        db.all('SELECT image_path FROM album_images WHERE album_id = ?', [album.id], (err, images) => {
                          if (err) reject(err);
                          album.images = images.map((img) => img.image_path); // Assign images to the album
                          resolve(album);
                        });
                      });
                    });

                    Promise.all(albumPromises)
                      .then((albumsWithImages) => {
                        // Render the admin page with all collected data
                        res.render('pages/admin', {
                          username: req.session.username,
                          banners: banners || [],
                          news: articles || [],
                          team: team || [],
                          knowUs: knowUs || { content: '', tagline: '', image_path: '' },
                          registrations: registrations || [],
                          curricula: curricula || [],
                          albums: albumsWithImages || [],
                        });
                      })
                      .catch((err) => {
                        console.error('Error processing albums:', err.message);
                        res.status(500).send('Error processing albums.');
                      });
                  });
                });
              });
            });
          });
        });
      });
    });
  } else {
    res.redirect('/login');
  }
});


app.get('/curricula', (req, res) => {
  db.all('SELECT * FROM curricula', (err, curricula) => {
    if (err) {
      console.error('Error fetching curricula:', err.message);
      return res.status(500).send('Error loading curricula.');
    }

    res.render('pages/curricula', {
      curricula: curricula || [],
    });
  });
});


app.get('/registration', (req, res) => {
  res.render('pages/registration'); 
});

app.post('/registration', (req, res) => {
  const { name, email, phone, address, date_of_birth, message } = req.body;

  db.run(
    'INSERT INTO registrations (name, email, phone, address, date_of_birth, message) VALUES (?, ?, ?, ?, ?, ?)',
    [name, email, phone, address, date_of_birth, message || null],
    (err) => {
      if (err) {
        console.error('SQL Query:', {
          query: 'INSERT INTO registrations (name, email, phone, address, date_of_birth, message) VALUES (?, ?, ?, ?, ?, ?)',
          params: [name, email, phone, address, date_of_birth, message || null],
        });
        console.error('Error saving registration:', err.message);
        return res
          .status(500)
          .json({ success: false, message: 'Error saving registration.' });
      }
  
      res.redirect('/');
    }
  );      
});  

app.post('/registrations/delete', (req, res) => {
  const { id } = req.body;

  db.run('DELETE FROM registrations WHERE id = ?', [id], (err) => {
    if (err) {
      console.error('Error deleting registration:', err.message);
      return res.status(500).send('Error deleting registration.');
    }

    res.redirect('/manageAsspa'); // Redirect back to the admin panel
  });
});




const multer = require('multer');
const fs = require('fs');

const ensureDirectoryExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const albumPath = path.join(__dirname, 'public/uploads/albums');
    ensureDirectoryExists(albumPath); 
    cb(null, albumPath); 
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName); 
  },
});

const upload = multer({ storage });


app.post('/albums/add', upload.array('images', 10), (req, res) => {
  const { title, description } = req.body;


  db.run(
    'INSERT INTO albums (title, description) VALUES (?, ?)',
    [title, description],
    function (err) {
      if (err) {
        console.error('Error saving album:', err.message);
        return res.status(500).send('Error saving album.');
      }

      const albumId = this.lastID;


      const imagePaths = req.files.map(file => `uploads/albums/${file.filename}`);
      const imageInsertPromises = imagePaths.map(imagePath => {
        return new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO album_images (album_id, image_path) VALUES (?, ?)',
            [albumId, imagePath],
            (err) => {
              if (err) {
                console.error('Error saving image:', err.message);
                reject(err);
              } else {
                resolve();
              }
            }
          );
        });
      });

      Promise.all(imageInsertPromises)
        .then(() => {
          res.redirect('/manageAsspa'); // Redirect to admin page after success
        })
        .catch(err => {
          console.error('Error saving album images:', err.message);
          res.status(500).send('Error saving album images.');
        });
    }
  );
});


app.post('/albums/delete', (req, res) => {
  const { id } = req.body;

  db.all('SELECT image_path FROM album_images WHERE album_id = ?', [id], (err, images) => {
    if (err) {
      console.error('Error fetching album images:', err.message);
      return res.status(500).send('Error fetching album images.');
    }

    images.forEach(image => {
      const filePath = path.join(__dirname, 'public', image.image_path);
      fs.unlink(filePath, err => {
        if (err) console.error('Error deleting file:', filePath, err.message);
      });
    });

    db.run('DELETE FROM album_images WHERE album_id = ?', [id], (err) => {
      if (err) {
        console.error('Error deleting album images:', err.message);
        return res.status(500).send('Error deleting album images.');
      }

      db.run('DELETE FROM albums WHERE id = ?', [id], (err) => {
        if (err) {
          console.error('Error deleting album:', err.message);
          return res.status(500).send('Error deleting album.');
        }

        res.redirect('/manageAsspa');
      });
    });
  });
});


app.get('/albums', (req, res) => {
  db.all('SELECT * FROM albums', (err, albums) => {
    if (err) {
      console.error('Error loading albums:', err.message);
      return res.status(500).send('Error loading albums.');
    }


    const albumPromises = albums.map((album) => {
      return new Promise((resolve, reject) => {
        db.all('SELECT image_path FROM album_images WHERE album_id = ?', [album.id], (err, images) => {
          if (err) reject(err);
          album.images = images.map((img) => img.image_path) || [];
          resolve(album);
        });
      });
    });


    Promise.all(albumPromises)
      .then((albumsWithImages) => {
        res.render('pages/albums', { albums: albumsWithImages });
      })
      .catch((err) => {
        console.error('Error processing albums:', err.message);
        res.status(500).send('Error processing albums.');
      });
  });
});

app.get('/albums/:id', (req, res) => {
  const albumId = req.params.id;

 
  db.get('SELECT * FROM albums WHERE id = ?', [albumId], (err, album) => {
    if (err) {
      console.error('Error fetching album:', err.message);
      return res.status(500).send('Error fetching album.');
    }

    if (!album) {
      return res.status(404).send('Album not found.');
    }

    db.all('SELECT image_path FROM album_images WHERE album_id = ?', [albumId], (err, images) => {
      if (err) {
        console.error('Error fetching album images:', err.message);
        return res.status(500).send('Error fetching album images.');
      }

      res.render('pages/album', {
        album,
        images: images.map((img) => img.image_path),
      });
    });
  });
});


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
