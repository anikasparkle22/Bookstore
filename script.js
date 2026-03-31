
const GENRE_MAP = {
  fiction:    'Fiction',
  nonfiction: 'Nonfiction',
  fantasy:    'Fantasy',
  romance:    'Romance',
  scifi:      'Sci-Fi',
  mystery:    'Mystery',
  horror:     'Horror',
};

const FORMATS = ['Hardcover', 'Paperback'];

let allBooks = [];

async function fetchBooks() {
  const grid     = document.getElementById('booksGrid');
  const countEl  = document.getElementById('resultsCount');
  grid.innerHTML = '<p class="loading-msg">Loading books from Open Library…</p>';

  try {
    const queries = [
      { genre: 'fiction',    q: 'fiction'         },
      { genre: 'nonfiction', q: 'nonfiction'       },
      { genre: 'fantasy',    q: 'fantasy'          },
      { genre: 'romance',    q: 'romance novel'    },
      { genre: 'scifi',      q: 'science fiction'  },
      { genre: 'mystery',    q: 'mystery detective'},
      { genre: 'horror',     q: 'horror'           },
    ];

    const responses = await Promise.all(
      queries.map(({ q }) =>
        fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=8&fields=key,title,author_name,cover_i,first_publish_year,format`)
          .then(r => r.json())
      )
    );

    const seen = new Set();
    allBooks   = [];

    responses.forEach((data, i) => {
      const genre = queries[i].genre;
      (data.docs || []).forEach(doc => {
        if (!seen.has(doc.key)) {
          seen.add(doc.key);
          const format = FORMATS[Math.floor(Math.random() * FORMATS.length)];
          allBooks.push({
            key:    doc.key,
            title:  doc.title,
            author: doc.author_name?.[0] || 'Unknown Author',
            coverId: doc.cover_i || null,
            year:   doc.first_publish_year || null,
            rating: parseFloat((Math.random() * 2 + 3).toFixed(1)),
            genre:  genre,
            format: format,
          });
        }
      });
    });

    renderBooks(allBooks);
  } catch (err) {
    grid.innerHTML = '<p class="loading-msg">Failed to load books. Please try again.</p>';
    countEl.textContent = 'Error loading books';
    console.error(err);
  }
}

function renderBooks(books) {
  const grid    = document.getElementById('booksGrid');
  const countEl = document.getElementById('resultsCount');

  if (!books.length) {
    grid.innerHTML = '<p class="loading-msg">No books match your filters.</p>';
    countEl.textContent = '0 books found';
    return;
  }

  countEl.textContent = `${books.length} book${books.length !== 1 ? 's' : ''} found`;

  grid.innerHTML = books.map(book => {
    const coverUrl = book.coverId
      ? `https://covers.openlibrary.org/b/id/${book.coverId}-M.jpg`
      : 'https://placehold.co/128x192/f0ebe0/999?text=No+Cover';

    const stars     = renderStars(book.rating);
    const yearBadge = book.year   ? `<span class="tag">${book.year}</span>`     : '';
    const fmtBadge  = book.format ? `<span class="tag">${book.format}</span>`   : '';

    return `
      <article class="book-card">
        <div class="book-cover">
          <img src="${coverUrl}" alt="${escapeHtml(book.title)}" loading="lazy">
        </div>
        <div class="book-info">
          <h3 class="book-title">${escapeHtml(book.title)}</h3>
          <p class="book-author">${escapeHtml(book.author)}</p>
          <div class="book-meta">
            <div class="stars">${stars}</div>
            <span class="reviews">${book.rating.toFixed(1)}</span>
          </div>
          <div class="book-bottom">
            ${yearBadge}
            ${fmtBadge}
            <a href="https://openlibrary.org${book.key}" target="_blank" class="view-btn">View</a>
          </div>
        </div>
      </article>`;
  }).join('');
}

function renderStars(rating) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  let html = '';
  for (let i = 0; i < 5; i++) {
    if (i < full)             html += '<span class="star full">★</span>';
    else if (i === full && half) html += '<span class="star half">★</span>';
    else                      html += '<span class="star empty">★</span>';
  }
  return html;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getFilterState() {
  // Sort
  const sortVal = document.getElementById('sortBy').value;

  // Author text search
  const authorQuery = document.getElementById('authorSearch').value.toLowerCase().trim();

  // Genre checkboxes — collect all checked genre values
  const checkedGenres = Array.from(
    document.querySelectorAll('input[data-genre]:checked')
  ).map(el => el.dataset.genre);

  // Rating radio — get selected minimum (empty string = no filter)
  const ratingRadio = document.querySelector('input[name="rating"]:checked');
  const minRating   = ratingRadio ? parseFloat(ratingRadio.value) || 0 : 0;

  // Format checkboxes — collect checked formats (lowercase for comparison)
  const checkedFormats = Array.from(
    document.querySelectorAll('input[data-format]:checked')
  ).map(el => el.dataset.format.toLowerCase());

  return { sortVal, authorQuery, checkedGenres, minRating, checkedFormats };
}


function getSortedFiltered() {
  const { sortVal, authorQuery, checkedGenres, minRating, checkedFormats } = getFilterState();

  let books = [...allBooks];

  // Genre filter — only apply if at least one genre is checked
  if (checkedGenres.length > 0) {
    books = books.filter(b => checkedGenres.includes(b.genre));
  }

  // Author filter
  if (authorQuery) {
    books = books.filter(b => b.author.toLowerCase().includes(authorQuery));
  }

  // Rating filter
  if (minRating > 0) {
    books = books.filter(b => b.rating >= minRating);
  }

  // Format filter — only apply if at least one format is checked
  if (checkedFormats.length > 0) {
    books = books.filter(b => checkedFormats.includes(b.format.toLowerCase()));
  }

  // Sort
  switch (sortVal) {
    case 'az':
      books.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case 'za':
      books.sort((a, b) => b.title.localeCompare(a.title));
      break;
    case 'newest':
      books.sort((a, b) => (b.year || 0) - (a.year || 0));
      break;
    case 'oldest':
      books.sort((a, b) => (a.year || 9999) - (b.year || 9999));
      break;
    default:
      break;
  }

  return books;
}

function applyFilters() {
  renderBooks(getSortedFiltered());
}


document.getElementById('sortBy').addEventListener('change', applyFilters);
document.getElementById('authorSearch').addEventListener('input', applyFilters);

// Genre checkboxes
document.querySelectorAll('input[data-genre]').forEach(el =>
  el.addEventListener('change', applyFilters)
);

// Rating radios
document.querySelectorAll('input[name="rating"]').forEach(el =>
  el.addEventListener('change', applyFilters)
);

// Format checkboxes
document.querySelectorAll('input[data-format]').forEach(el =>
  el.addEventListener('change', applyFilters)
);

fetchBooks();