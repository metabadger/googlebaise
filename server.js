const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const ejs = require('ejs');  // For rendering HTML with data
const mongoURI = 'mongodb://localhost/googlebaise'; // Make sure this is the correct URI

// Initialize Express app
const app = express();

// Set EJS as the default view engine
app.set('view engine', 'ejs');  // Tells Express to use EJS
app.set('views', path.join(__dirname, 'views'));  // Define where your views (EJS files) are located

// Enable CORS (to handle cross-origin requests)
app.use(cors());

// Middleware to parse incoming JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//HTTP headers helmet security
const helmet = require('helmet');
app.use(helmet());

// Serve static files (images) from the 'uploads' folder
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB connection
mongoose.connect('mongodb://127.0.0.1:27017/googlebaise', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})    
    .then(() => console.log('MongoDB connected successfully'))
    .catch((err) => console.error('MongoDB connection error: ', err));

// Setup multer (image upload middleware)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');  // Save images in the 'uploads' folder
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));  // Ensure unique file names
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // Limit to 10MB
    fileFilter: (req, file, cb) => {
        const fileTypes = /jpeg|jpg|png|gif/;
        const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
        const mimeType = fileTypes.test(file.mimetype);
        if (extname && mimeType) {
            return cb(null, true);
        }
        return cb(new Error('Only image files are allowed!'), false);
    }
});
// Create a simple schema for posts
const postSchema = new mongoose.Schema({
    image: String,
    opinion: String,
    rating: Number,
    coordinates: { lat: Number, lon: Number },
    createdAt: { type: Date, default: Date.now }
});

const Post = mongoose.model('Post', postSchema);

// Root route to render homepage with posts
app.get('/', async (req, res) => {
    try {
        const posts = await Post.find().sort({ createdAt: -1 });  // Sort by createdAt in descending order
        res.render('index', { posts: posts });  // Render the EJS view with sorted posts
    } catch (err) {
        console.error(err);
        res.status(500).send('Failed to retrieve posts');
    }
});

// Route to render the map with pinpoints
app.get('/map', async (req, res) => {
    try {
        const posts = await Post.find();  // Fetch all posts
        res.render('map', { posts: posts });  // Render the map.ejs view, passing posts data
    } catch (err) {
        console.error(err);
        res.status(500).send('Failed to load the map.');
    }
});



// ** GET Route for retrieving all posts (API) **
app.get('/get-posts', async (req, res) => {
    try {
        const posts = await Post.find();  // Fetch posts from the database
        res.json({ success: true, posts: posts });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Failed to retrieve posts' });
    }
});

// ** POST Route for submitting a new post **
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: true });

app.post('/submit-post', csrfProtection, upload.single('image'), async (req, res) => {
    try {
        const { opinion, rating, coordinates } = req.body;
        validatePostData({ opinion, rating, coordinates });

        const image = req.file ? req.file.path : null;

        const newPost = new Post({
            image,
            opinion,
            rating,
            coordinates: JSON.parse(coordinates) 
        });

        await newPost.save();
        res.redirect('/'); 
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message || 'Failed to submit post' });
    }
});


const validatePostData = (data) => {
    const { opinion, rating, coordinates } = data;

    // Validate opinion
    if (typeof opinion !== 'string' || opinion.length < 1 || opinion.length > 500) {
        throw new Error('Invalid opinion length');
    }

    // Validate rating
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
        throw new Error('Invalid rating');
    }

    // Validate coordinates
    try {
        const { lat, lon } = JSON.parse(coordinates);
        if (typeof lat !== 'number' || lat < -90 || lat > 90) {
            throw new Error('Invalid latitude');
        }
        if (typeof lon !== 'number' || lon < -180 || lon > 180) {
            throw new Error('Invalid longitude');
        }
    } catch (err) {
        throw new Error('Invalid coordinates');
    }
};


// Start the server on port 3000
app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
