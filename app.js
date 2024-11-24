const express = require('express');
const bcrypt = require('bcrypt');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3001;
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

      db.all('SELECT * FROM news_images', (err, images) => {
        if (err) {
          console.error(err.message);
          return res.status(500).send('Error loading images.');
        }

        // Map images to their respective news articles
        const imagesByNews = images.reduce((acc, img) => {
          acc[img.news_id] = acc[img.news_id] || [];
          acc[img.news_id].push(img.image_path);
          return acc;
        }, {});

        // Add images array to each news article
        news.forEach((article) => {
          article.images = imagesByNews[article.ID] || [];
        });

        // Fetch team data
        db.all('SELECT * FROM team', (err, team) => {
          if (err) {
            console.error(err.message);
            return res.status(500).send('Error loading team.');
          }

          res.render('pages/home', {
            banners: banners || [],
            news: news || [],
            team: team || [], // Add team data to the template
          });
        });
      });
    });
  });
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
    // Fetch banners
    db.all('SELECT * FROM banners', (err, banners) => {
      if (err) {
        console.error(err.message);
        return res.status(500).send('Error loading banners.');
      }

      // Fetch articles with their images
      db.all('SELECT * FROM news', (err, articles) => {
        if (err) {
          console.error(err.message);
          return res.status(500).send('Error loading news.');
        }

        const articlePromises = articles.map(article => {
          return new Promise((resolve, reject) => {
            db.all(
              'SELECT image_path, id FROM news_images WHERE news_id = ?',
              [article.ID],
              (err, images) => {
                if (err) {
                  console.error(`Error fetching images for news ID ${article.ID}:`, err.message);
                  return reject(err);
                }
                article.images = images || [];
                resolve(article);
              }
            );
          });
        });

        // Fetch team members
        Promise.all(articlePromises).then(news => {
          db.all('SELECT * FROM team', (err, team) => {
            if (err) {
              console.error('Error fetching team:', err.message);
              return res.status(500).send('Error loading team members.');
            }

            // Render admin page with all data
            res.render('pages/admin', {
              username: req.session.username,
              banners: banners || [],
              news: news || [],
              team: team || [] // Include team in the admin template
            });
          });
        }).catch(err => {
          console.error('Error processing news data:', err.message);
          res.status(500).send('Error processing news data.');
        });
      });
    });
  } else {
    res.redirect('/login');
  }
});






app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
