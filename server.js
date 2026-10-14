require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the "public" folder
app.use(express.static('public'));

//////////////////////////////////////
//ROUTES TO SERVE HTML FILES
//////////////////////////////////////
// Default route to serve logon.html
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/html/logon.html');
});

// Route to serve dashboard.html
app.get('/dashboard', (req, res) => {
    res.sendFile(__dirname + '/public/html/dashboard.html');
});
//////////////////////////////////////
//END ROUTES TO SERVE HTML FILES
//////////////////////////////////////


/////////////////////////////////////////////////
//DATABASE CONNECTION AND AUTHENTICATION MIDDLEWARE
/////////////////////////////////////////////////
// One shared connection pool to the Supabase Postgres database.
// Supabase requires SSL, so it is turned on here.
const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false },
});

// **Authorization Middleware: Verify JWT and check the user still exists**
// The front end sends the JWT in the "authorization" header.
async function authenticateToken(req, res, next) {
    let token = req.headers['authorization'];

    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }
    if (token.startsWith('Bearer ')) {
        token = token.slice(7);  // also accept the "Bearer <jwt>" format
    }

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid token.' });
        }

        try {
            // Make sure the email in the token still belongs to an account
            const result = await pool.query(
                'SELECT email FROM public.app_users WHERE lower(email) = lower($1)',
                [decoded.email]
            );

            if (result.rows.length === 0) {
                return res.status(403).json({ message: 'Account not found or deactivated.' });
            }

            req.user = decoded;  // Save the decoded email for use in the route
            next();  // Proceed to the route handler
        } catch (dbError) {
            console.error(dbError);
            res.status(500).json({ message: 'Database error during authentication.' });
        }
    });
}
/////////////////////////////////////////////////
//END DATABASE CONNECTION AND AUTHENTICATION MIDDLEWARE
/////////////////////////////////////////////////


//////////////////////////////////////
//ROUTES TO HANDLE API REQUESTS
//////////////////////////////////////
// Route: Create Account
app.post('/api/create-account', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        // Salt and hash the password (bcrypt adds a random salt, 10 rounds)
        const hashedPassword = await bcrypt.hash(password, 10);

        await pool.query(
            'INSERT INTO public.app_users (email, password_hash) VALUES ($1, $2)',
            [email.trim().toLowerCase(), hashedPassword]
        );

        res.status(201).json({ message: 'Account created successfully!' });
    } catch (error) {
        if (error.code === '23505') {  // Postgres unique violation
            res.status(409).json({ message: 'An account with this email already exists.' });
        } else {
            console.error(error);
            res.status(500).json({ message: 'Error creating account.' });
        }
    }
});

// Route: Logon
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        const result = await pool.query(
            'SELECT email, password_hash FROM public.app_users WHERE lower(email) = lower($1)',
            [email.trim()]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const user = result.rows[0];

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const token = jwt.sign(
            { email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({ token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error logging in.' });
    }
});

// Route: Get All Email Addresses (protected: requires a valid JWT)
app.get('/api/users', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT email FROM public.app_users ORDER BY email');

        const emailList = result.rows.map((row) => row.email);
        res.status(200).json({ emails: emailList });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error retrieving email addresses.' });
    }
});
//////////////////////////////////////
//END ROUTES TO HANDLE API REQUESTS
//////////////////////////////////////

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
