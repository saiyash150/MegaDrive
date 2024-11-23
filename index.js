const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./database'); // Fix capitalization to match file name

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  next();
});

// Routes with prepared statements and proper error handling
app.get('/api/notes', (req, res) => {
  const { search } = req.query;
  let sql = 'SELECT * FROM notes';
  const params = [];

  if (search) {
    sql += ' WHERE title LIKE ? OR category LIKE ? OR description LIKE ?';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  sql += ' ORDER BY created_at DESC';

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('Error fetching notes:', err.message);
      return res.status(500).json({ error: 'Failed to retrieve notes' });
    }
    res.json(rows || []);
  });
});

app.post('/api/notes', (req, res) => {
  const { title, description, category } = req.body;

  if (!title?.trim() || !description?.trim()) {
    return res.status(400).json({ error: 'Title and description are required and cannot be empty' });
  }

  const sql = `
    INSERT INTO notes (title, description, category, created_at, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `;

  db.run(sql, [title.trim(), description.trim(), (category || 'Others').trim()], function(err) {
    if (err) {
      console.error('Error creating note:', err.message);
      return res.status(500).json({ error: 'Failed to create note' });
    }
    res.status(201).json({ 
      id: this.lastID, 
      message: 'Note created successfully',
      note: { title, description, category: category || 'Others', id: this.lastID }
    });
  });
});

app.put('/api/notes/:id', (req, res) => {
  const { id } = req.params;
  const { title, description, category } = req.body;

  if (!title?.trim() || !description?.trim()) {
    return res.status(400).json({ error: 'Title and description are required and cannot be empty' });
  }

  if (!Number.isInteger(parseInt(id))) {
    return res.status(400).json({ error: 'Invalid note ID' });
  }

  const sql = `
    UPDATE notes
    SET title = ?, description = ?, category = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  db.run(sql, [title.trim(), description.trim(), (category || 'Others').trim(), id], function(err) {
    if (err) {
      console.error('Error updating note:', err.message);
      return res.status(500).json({ error: 'Failed to update note' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json({ message: 'Note updated successfully', id: parseInt(id) });
  });
});

app.delete('/api/notes/:id', (req, res) => {
  const { id } = req.params;

  if (!Number.isInteger(parseInt(id))) {
    return res.status(400).json({ error: 'Invalid note ID' });
  }

  const sql = 'DELETE FROM notes WHERE id = ?';

  db.run(sql, [id], function(err) {
    if (err) {
      console.error('Error deleting note:', err.message);
      return res.status(500).json({ error: 'Failed to delete note' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json({ message: 'Note deleted successfully', id: parseInt(id) });
  });
});

// Error handling for undefined routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start the server with error handling
const server = app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
}).on('error', (err) => {
  console.error('Server failed to start:', err.message);
  process.exit(1);
});
