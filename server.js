const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./Database');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors()); 
app.use(bodyParser.json()); 


app.get('/api/notes', (req, res) => {
  const { search } = req.query;

  let sql = 'SELECT * FROM notes';
  const params = [];

  
  if (search) {
    sql += ' WHERE title LIKE ? OR category LIKE ?';
    params.push(`%${search}%`, `%${search}%`);
  }

  
  sql += ' ORDER BY created_at DESC';

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('Error fetching notes:', err.message);
      return res.status(500).json({ error: 'Failed to retrieve notes' });
    }
    res.json(rows);
  });
});


app.post('/api/notes', (req, res) => {
  const { title, description, category } = req.body;

  
  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required' });
  }

  const sql = `
    INSERT INTO notes (title, description, category, created_at, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `;

  db.run(sql, [title, description, category || 'Others'], function (err) {
    if (err) {
      console.error('Error creating note:', err.message);
      return res.status(500).json({ error: 'Failed to create note' });
    }
    res.status(201).json({ id: this.lastID, message: 'Note created successfully' });
  });
});


app.put('/api/notes/:id', (req, res) => {
  const { id } = req.params;
  const { title, description, category } = req.body;

  
  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required' });
  }

  const sql = `
    UPDATE notes
    SET title = ?, description = ?, category = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  db.run(sql, [title, description, category || 'Others', id], function (err) {
    if (err) {
      console.error('Error updating note:', err.message);
      return res.status(500).json({ error: 'Failed to update note' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json({ message: 'Note updated successfully' });
  });
});


app.delete('/api/notes/:id', (req, res) => {
  const { id } = req.params;

  const sql = `DELETE FROM notes WHERE id = ?`;

  db.run(sql, id, function (err) {
    if (err) {
      console.error('Error deleting note:', err.message);
      return res.status(500).json({ error: 'Failed to delete note' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json({ message: 'Note deleted successfully' });
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
