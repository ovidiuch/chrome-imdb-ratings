// Constants
var GOOD_MOVIE_RATING = 7;
var GOOD_TV_RATING = 8;
var COLOR_THRESHOLD = 160;

var getIdFromLink = function(href) {
  var matches = href.match(/title\/([a-z0-9]+)/i);
  return matches ? matches[1] : null;
};
var getRatingTag = function(rating) {
  var tag = $('<span/>');
  // Add extra spaces to not touch with any surrounding elements
  tag.html(' ' + (rating ? rating : 'N/A') + ' ');
  // No colors for now (check older commits for getRatingColor function)
  tag.css('color', '#444');
  return tag;
};
var getMovieType = function(row) {
  // Since the omdb api does not return any data regarding the type of the
  // movie (documentary, tv series, etc.), we have to search for all sort of
  // info within the movie row detect its type
  var matches = $(row).text().match(/\((.+?)\)/);
  return matches ? matches[1] : 'Film';
}
var isGoodMovie = function(row, rating) {
  var type = getMovieType(row);
  if (type == 'Video Game') {
    return false;
  }
  return rating >= (type == 'Film' ? GOOD_MOVIE_RATING : GOOD_TV_RATING);
};
var addRatingToMovieRow = function(row, callback) {
  // Select the first anchor from row which has its href containing the word
  // "title," this way confirming that it's the one linking to the movie page
  // (in case the markup changes in the future). We want the anchor with the
  // link to the movie page because it contains the movie id
  $(row).find('a[href*=title]:first').each(function(i, anchor) {
    var id = getIdFromLink(this.href);
    // Bail out if no id could be extracted from the anchor's href
    if (!id) {
      // Also return an empty rating for expectedRatings to decrement
      callback(null);
      return;
    }
    // Request omdb api movie data for respective id
    $.get('http://www.omdbapi.com/?i=' + id, function(response, xhr) {
      var data = JSON.parse(response);
      // Bail out if response is invalid or imdbRating is missing
      if (!data || !data.imdbRating) {
        callback(null);
        return;
      }
      var rating = parseFloat(data.imdbRating, 10);
      // Insert rating tag after name anchor
      $(anchor).after(getRatingTag(rating));
      // Make not important stuff opaque
      $(row).css('opacity', isGoodMovie(row, rating) ? 1 : 0.6);
      callback(rating);
    });
  });
};
$.fn.loadPageRatings = function() {
  $(this).each(function(i, content) {
    // Only target main filmography section for both having a more relevant
    // actor average and making fewer requests
    var rows = $(this).find('#filmography').children().eq(1).find('.filmo-row');
    var ratingSum = 0;
    var ratingCount = 0;
    // Since gathering each rating requires an asynchronous request, we need
    // to know when all ratings have been gathered, so we start from the number
    // of film rows and wait until it has been consumed
    var expectedRatings = rows.length;
    rows.each(function() {
      // Send a callback for each movie in order to collect all rating from
      // this page and generate a mean for the featured actor
      // XXX what other listing are there besides actor pages?
      addRatingToMovieRow(this, function(rating) {
        // Only add rating to list if it's a valid number, otherwise just
        // decrement the expected ratings count and ignore the value
        if (rating) {
          ratingSum += rating;
          ratingCount++;
        }
        // When a rating (be it N/A) for each movie has been returned, calculate
        // and display average score of actor
        if (!--expectedRatings) {
          var mean = (ratingSum / ratingCount).toFixed(1);
          // Add actor mean next to its name
          $(content).find('h1.header').each(function() {
            var tag = getRatingTag(mean);
            var span = $(this).find('span:first');
            if (span.length) {
              span.before(tag);
            } else {
              $(this).append(tag);
            }
          });
        }
      });
    });
  });
};
$(function() {
  // Load ratings for current page
  $('#pagecontent').loadPageRatings();
});