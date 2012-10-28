var getIdFromLink = function(href) {
  var matches = href.match(/title\/([a-z0-9]+)/i);
  return matches ? matches[1] : null;
};
var getRatingRange = function(rating) {
  // Get [0,1] range from rating
  // e.g. 1 becomes 0, 10 becomes 1
  return ((rating - 1) * 10 / 90).toFixed(2);
};
var getRatingColor = function(rating) {
  // Make N/A ratings grey
  if (!rating) {
    return 'gray';
  }
  rating = getRatingRange(rating);
  var red = 160;
  var green = 160;
  if (rating < 0.5) {
    green = (160 * rating / 0.5).toFixed(0);
  } else if (rating > 0.5) {
    red = 160 - (160 * (rating - 0.5) / 0.5).toFixed(0);
  }
  return 'rgb(' + red + ', ' + green + ', 0)';
};
var getRatingTag = function(rating) {
  var tag = $('<b></b>');
  // Add extra spaces to not touch with any surrounding elements
  tag.html(' ' + rating + ' ');
  tag.css({
    fontWeight: rating >= 7 ? 'bold' : 'normal',
    color: getRatingColor(parseFloat(rating, 10))
  });
  return tag;
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
      var rating = data.imdbRating;
      // Only make bold if not a series
      $(anchor).after(getRatingTag(rating));
      callback(parseFloat(rating, 10));
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