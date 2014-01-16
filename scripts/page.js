// We highlight entries gradually between BAD and GOOD ratings. Anything below
// has the MIN opacity/color and above has the MAX ones
var RATING_GRADES = {
  BAD: 4,
  GOOD: 7.8
};

// Certain media types like TV Shows or Video Games have higher ratings on
// average and we grade them more strictly
var RATING_HANDICAP_PER_TYPE = {
  'TV Series': 1,
  'Video Game': 1.4,
  UNKNOWN: 2
};

var getIdFromLink = function(href) {
  var matches = href.match(/title\/([a-z0-9]+)/i);
  return matches ? matches[1] : null;
};
var getRatingTag = function(rating) {
  var tag = $('<span/>');
  // Add extra spaces to not touch with any surrounding elements
  tag.html(' (' + (rating ? (typeof rating != 'number' ? rating : rating.toFixed(1)) : 'N/A') + ') ');
  // No colors for now (check older commits for getRatingColor function)
  tag.css('color', '#444');
  return tag;
};
var getMovieType = function(row) {
  // Since the omdb api does not return any data regarding the type of the
  // movie (documentary, tv series, etc.), we have to search for all sort of
  // info within the movie row detect its type

  // Regex checks for (rating)(type) and captures only the (type)
  // [\s]* is needed in between rating and type to match whitespace/newline
  var matches = $(row).text().match(/\([^\)]+\)[\s]*\(([^\)]+)\)/);
  return matches ? matches[1] : 'Film';
};
var getStandardizedRating = function(row, rating){
  var type = getMovieType(row);
  if (type == 'Video Game') {
    return rating-RATING_HANDICAP_PER_TYPE['Video Game'];
  }
  return (type == 'Film' ? rating : rating-RATING_HANDICAP_PER_TYPE['TV Series']);
};
// Creates a linear fade between startout and endout values.
// E.g. produce a fade clamped between transparent and
// opaque with between ratings start and end.
var getFadeVal = function(start,startout,end,endout,input){
  var m=(startout-endout)/(start-end);
  var c = startout-(start*m);
  var max = Math.max(startout,endout);
  var min = Math.min(startout,endout);
  return Math.max(min,Math.min(max,m*input+c));
};
var getMovieOpacity = function(input) { return getFadeVal(RATING_GRADES.BAD,0.4,RATING_GRADES.GOOD,1,input) };
var getMovieColor   = function(input) { return getFadeVal(RATING_GRADES.BAD,32,RATING_GRADES.GOOD,10,input) };
var addRatingToMovieRow = function(row, callback) {
  // Make sure you don't load the same ratings more times
  if ($(row).hasClass('with-rating')) {
    callback(null);
    return;
  }
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
      // Make not important stuff opaque, with darker color
      var sRating = isNaN(rating) ? RATING_GRADES.BAD : getStandardizedRating(row, rating);
      $(row).css('opacity', getMovieOpacity(sRating));
      $('a:link, a:hover',row).css('color', 'hsl(206,81%,'+getMovieColor(sRating)+'%)');
      callback(rating);
    });
  });
  // Mark this section as having ratings loaded
  $(row).addClass('with-rating');
};
$.fn.loadSectionRatings = function(callback) {
  $(this).each(function(i, section) {
    var rows = $(this).find('.filmo-row');
    var ratingSum = 0;
    var ratingCount = 0;
    // Since gathering each rating requires an asynchronous request, we need
    // to know when all ratings have been gathered, so we start from the number
    // of film rows and wait until it has been consumed
    var expectedRatings = rows.length;
    rows.each(function() {
      // Send a callback for each movie in order to collect all rating from
      // this page and generate a mean for the featured actor
      addRatingToMovieRow(this, function(rating) {
        // Only add rating to list if it's a valid number, otherwise just
        // decrement the expected ratings count and ignore the value
        if (rating) {
          ratingSum += rating;
          ratingCount++;
        }
        // When a rating (be it N/A) for each movie has been returned, calculate
        // average rating and fire callback with it, if one is received
        if (!--expectedRatings) {
          var mean = (ratingSum / ratingCount).toFixed(1);
          if (typeof(callback) == 'function') {
            callback(mean);
          }
        }
      });
    });
  });
};
$.fn.loadPageRatings = function() {
  $(this).each(function(i, content) {
    var sections = $(this).find('#filmography').children(':odd');
    // Only target the visible filmography section for both having a more
    // relevant actor average and making fewer requests (at first). Show
    // average rating of person based on this (main) section
    sections.first(':visible').loadSectionRatings(function(rating) {
      // Add person rating next to its name
      $(content).find('h1.header').each(function() {
        var tag = getRatingTag(rating);
        var span = $(this).find('span:first');
        if (span.length) {
          span.before(tag);
        } else {
          $(this).append(tag);
        }
      });
    });
    // Add click handlers for all remaining sections, in order for them to load
    // as soon as they are toggled visible
    sections.filter(':hidden').each(function(i) {
      $(this).prev().click(function() {
        $(this).next().loadSectionRatings();
      });
    });
  });
};
$(function() {
  // Load ratings for current page
  $('#pagecontent').loadPageRatings();
});