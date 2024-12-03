const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MySQL Database Connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    process.exit(1);
  }
  console.log('Connected to MySQL Database');
});

// Helper function for error response
const sendErrorResponse = (res, statusCode, message) => {
  console.error(`[Error] ${message}`);
  res.status(statusCode).json({ error: message });
};

// Courses Routes
app.get('/api/courses', (req, res) => {
  const { facultyId } = req.query;
  const query = facultyId
    ? 'SELECT * FROM courses WHERE faculty_id = ?'
    : 'SELECT * FROM courses';

  db.query(query, facultyId ? [facultyId] : [], (err, results) => {
    if (err) return sendErrorResponse(res, 500, 'Error retrieving courses');
    res.json(results);
  });
});

app.post('/api/courses', (req, res) => {
  const { name, faculty_id } = req.body;

  if (!name || !faculty_id) {
    return sendErrorResponse(res, 400, 'Name and Faculty ID are required');
  }

  const checkFacultyQuery = 'SELECT * FROM faculties WHERE id = ?';
  db.query(checkFacultyQuery, [faculty_id], (err, results) => {
    if (err) return sendErrorResponse(res, 500, 'Error checking faculty');
    if (results.length === 0) {
      return sendErrorResponse(res, 400, 'Invalid faculty ID');
    }

    const query = 'INSERT INTO courses (name, faculty_id) VALUES (?, ?)';
    db.query(query, [name, faculty_id], (err, result) => {
      if (err) return sendErrorResponse(res, 500, 'Error adding course');
      res.status(201).json({ id: result.insertId, name, faculty_id });
    });
  });
});

// Faculties Routes
app.get('/api/faculties', (req, res) => {
  const { instituteId } = req.query;
  const query = instituteId
    ? 'SELECT * FROM faculties WHERE institute_id = ?'
    : 'SELECT * FROM faculties';

  db.query(query, instituteId ? [instituteId] : [], (err, results) => {
    if (err) return sendErrorResponse(res, 500, 'Error retrieving faculties');
    res.json(results);
  });
});

app.post('/api/faculties', (req, res) => {
  const { name, instituteId } = req.body;

  if (!name || !instituteId) {
    return sendErrorResponse(res, 400, 'Name and Institute ID are required');
  }

  const query = 'INSERT INTO faculties (name, institute_id) VALUES (?, ?)';
  db.query(query, [name, instituteId], (err, result) => {
    if (err) return sendErrorResponse(res, 500, 'Error adding faculty');
    res.status(201).json({ faculty_id: result.insertId, name });
  });
});

// Users Routes
app.post('/api/users/signup', async (req, res) => {
  const { email, password, role, profileInfo } = req.body;

  if (!email || !password || !role) {
    return sendErrorResponse(res, 400, 'Email, password, and role are required');
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    let query;
    let values;

    switch (role) {
      case 'Admin':
        query = 'INSERT INTO Admins (email, password_hash, profile_info) VALUES (?, ?, ?)';
        values = [email, passwordHash, profileInfo];
        break;
      case 'Institution':
        query = 'INSERT INTO Institutes (email, password_hash, profile_info) VALUES (?, ?, ?)';
        values = [email, passwordHash, profileInfo];
        break;
      case 'Student':
        query = 'INSERT INTO Students (email, password_hash, profile_info) VALUES (?, ?, ?)';
        values = [email, passwordHash, profileInfo];
        break;
      default:
        return sendErrorResponse(res, 400, 'Invalid role');
    }

    db.query(query, values, (err) => {
      if (err) return sendErrorResponse(res, 500, 'Error creating user');
      res.status(201).json({ message: `${role} created successfully` });
    });
  } catch (error) {
    console.error('Error during signup:', error);
    sendErrorResponse(res, 500, 'Internal server error');
  }
});

app.post('/api/users/login', async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return sendErrorResponse(res, 400, 'Email, password, and role are required');
  }

  let query;
  switch (role) {
    case 'Admin':
      query = 'SELECT * FROM Admins WHERE email = ?';
      break;
    case 'Institution':
      query = 'SELECT * FROM Institutes WHERE email = ?';
      break;
    case 'Student':
      query = 'SELECT * FROM Students WHERE email = ?';
      break;
    default:
      return sendErrorResponse(res, 400, 'Invalid role');
  }

  db.query(query, [email], async (err, results) => {
    if (err) return sendErrorResponse(res, 500, 'Error logging in');
    if (results.length === 0) return sendErrorResponse(res, 404, 'User not found');

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) return sendErrorResponse(res, 401, 'Invalid credentials');
    res.status(200).json({ message: 'Login successful', user: { email: user.email, role } });
  });
});

// Institutes Routes
app.post('/api/institutes', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return sendErrorResponse(res, 400, 'Name, email, and password are required');
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = 'INSERT INTO Institutes (name, email, password_hash) VALUES (?, ?, ?)';

    db.query(query, [name, email, hashedPassword], (err, result) => {
      if (err) return sendErrorResponse(res, 500, 'Error adding institute');
      res.status(201).json({ message: 'Institute added successfully', institute_id: result.insertId });
    });
  } catch (error) {
    console.error('Error adding institute:', error);
    sendErrorResponse(res, 500, 'Internal server error');
  }
});

app.get('/api/institutes', (req, res) => {
  const query = 'SELECT id AS institute_id, name, email FROM Institutes';
  db.query(query, (err, results) => {
    if (err) return sendErrorResponse(res, 500, 'Error fetching institutes');
    res.json(results);
  });
});

app.delete('/api/institutes/:id', (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM Institutes WHERE id = ?';

  db.query(query, [id], (err) => {
    if (err) return sendErrorResponse(res, 500, 'Error deleting institute');
    res.status(200).json({ message: 'Institute deleted successfully' });
  });
});

// Applications Routes
app.post('/api/applications', (req, res) => {
  const { courseId, name, email } = req.body;

  if (!courseId || !name || !email) {
    return sendErrorResponse(res, 400, 'Course ID, name, and email are required.');
  }

  const query = 'INSERT INTO applications (course_id, name, email, status) VALUES (?, ?, ?, "pending")';
  db.query(query, [courseId, name, email], (err) => {
    if (err) {
      console.error('Error submitting application:', err);
      return sendErrorResponse(res, 500, 'Failed to submit application.');
    }
    res.status(201).json({ message: 'Application submitted successfully.' });
  });
});

app.get('/api/applications', (req, res) => {
  const { courseId } = req.query;

  if (!courseId) {
    return sendErrorResponse(res, 400, 'Course ID is required.');
  }

  const query = 'SELECT * FROM applications WHERE course_id = ?';
  db.query(query, [courseId], (err, results) => {
    if (err) return sendErrorResponse(res, 500, 'Error retrieving applications');
    res.json(results);
  });
});

app.put('/api/applications/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return sendErrorResponse(res, 400, 'Invalid status value.');
  }

  const query = 'UPDATE applications SET status = ? WHERE id = ?';
  db.query(query, [status, id], (err) => {
    if (err) {
      console.error('Error updating application status:', err);
      return sendErrorResponse(res, 500, 'Failed to update application status.');
    }
    res.status(200).json({ message: `Application status updated to ${status}` });
  });
});

app.get('/api/courses/:id', (req, res) => {
  const { id } = req.params;

  const query = 'SELECT * FROM courses WHERE id = ?';
  db.query(query, [id], (err, results) => {
    if (err) {
      console.error('Error retrieving course details:', err);
      return sendErrorResponse(res, 500, 'Failed to retrieve course details.');
    }

    if (results.length === 0) {
      return sendErrorResponse(res, 404, 'Course not found.');
    }

    res.json(results[0]);
  });
});

// Start Server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
