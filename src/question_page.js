
module.exports = {
  show_questions: function (response, page_number, search_terms, questions_per_page) {
    show_questions(response, page_number, search_terms, questions_per_page)
  },
};

function handle_error(response, err) {
    if(err) {
        console.log("Failed to connect to Database")
        response.write(html + "Failed to connect to database" + _html)
        response.end()
        return true
    }
    return false
}

function show_questions(response, page_number, search_terms, questions_per_page) {

    var fs = require('fs')
    var striptags = require('striptags')
    var escape_html = require('escape-html');
    var utils = require('./utils')
    const { Pool, Client } = require('pg')

    const client = new Client({
        user: 'postgres',
        host: '127.0.0.1',
        database: 'stackoverflow',
        port: 5432,
    })
    client.connect(function(err, callback) {
        if (handle_error(response, err))
            return
        /*
        sql_query = 'SELECT * FROM posts WHERE title IS NOT NULL AND '
        for (var i = 0; i < search_terms.length; i++) {
            sql_query += "CONTAINS(title, '" + search_terms[i] + "') AND "
        }
        sql_query = sql_query.substring(0, sql_query.length - 4);
        sql_query += 'ORDER BY score DESC LIMIT 30 OFFSET ' + 30*page_number
        */

        fs.readFile('./primary.css', function (err, css) {
            var sql_query = ''
            if (search_terms == null) {
                sql_query = 'SELECT * FROM posts WHERE title IS NOT NULL ORDER BY score DESC LIMIT ' + questions_per_page + ' OFFSET ' + questions_per_page*page_number
            }
            else {
                search_terms_split = search_terms.split('+')
                sql_query = 'SELECT * FROM posts WHERE title IS NOT NULL AND ('
                for (var i = 0; i < search_terms_split.length; i++) {
                    sql_query += "tags LIKE '%" + search_terms_split[i].toLowerCase() + "%' OR "
                }
                sql_query = sql_query.substring(0, sql_query.length - 4);
                sql_query += ") AND "

                for (var i = 0; i < search_terms_split.length; i++) {
                    sql_query += "LOWER(title) LIKE '%" + search_terms_split[i].toLowerCase() + "%' AND "
                }
                sql_query = sql_query.substring(0, sql_query.length - 4);
                sql_query += 'LIMIT ' + questions_per_page + ' OFFSET ' + questions_per_page*page_number
            }

            client.query(sql_query, (err, res) => {
                if (handle_error(response, err))
                    return

                var html_begin = '<!DOCTYPE html><html class=""><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8">\
                              <title>aStack Overflow - Offline</title><div id="content"><div id="mainbar"><div class="subheader">\
                              <h1>Questions</h1><form id="search" align="right" action="/search" method="get">\
                              <input name="q" type="text" placeholder="Search..." value="" autocomplete="off" maxlength="500" class="f-input js-search-field">\
                              <button class="astext"><svg aria-hidden="true" class="svg-icon iconSearch" width="18" height="18" viewBox="0 0 18 18">\
                              <path d="M12.86 11.32L18 16.5 16.5 18l-5.18-5.14v-.35a7 7 0 1 1 1.19-1.19h.35zM7 12A5 5 0 1 0 7 2a5 5 0 0 0 0 10z"></path></svg></button></form></div>'

                var html_end = '</div></div></html>'

                if (search_terms == null) {
                    // Add Previous & Next page buttons
                    var previous_page = 'page' + (page_number-1)
                    if (page_number-1 < 0)
                        previous_page = 'page' + '0'
                    var next_page = 'page' + (page_number+1)
                    var first_page = 'page0'
                }
                else {
                    // Add Previous & Next page buttons
                    var previous_page = 'search?q=' + search_terms + '/page' + (page_number-1)
                    if (page_number-1 < 0)
                        previous_page = 'search?q=' + search_terms + '/page' + '0'
                    var next_page = 'search?q=' + search_terms + '/page' + (page_number+1)
                    var first_page = 'search?q=' + search_terms + '/page0'
                }

                var html_page_buttons = '<div class="question-summary"><a href="' +
                                    first_page + '" rel="first" title="go to page x">\
                                    <span class="page-numbers next"> first</span> </a><a href="' +
                                    previous_page + '" rel="previous" title="go to page ' +
                                    previous_page + '"><span class="page-numbers next"> previous</span></a><a href="' +
                                    next_page + '" rel="next" title="go to page' +
                                    next_page + '"><span class="page-numbers next"> next</span></a></div>'

                // Send begenning of HTML page before for loop
                response.write(html_begin + '<style>' + css + '</style>' + html_page_buttons)

                // Construct questions to display on the HTML homepage
                for(var i = 0; i < questions_per_page; i++) {

                    var title = escape_html(res.rows[i]['title'])
                    var title_link = 'question' + res.rows[i]['id']

                    if (title == 'null' || title == null)
                        continue

                    // Parse SQL Query
                    var score = res.rows[i]['score']
                    var num_answers = res.rows[i]['answercount']
                    var num_views = utils.number_to_shorthand(res.rows[i]['viewcount'])
                    var date_asked = res.rows[i]['creationdate']
                    var asked_by = res.rows[i]['owneruserid']
                    // TODO: Get user name, rep, gold, silver, and bronze
                    var asked_by_rep = utils.number_to_shorthand('0')
                    var asked_by_rep_gold = utils.number_to_shorthand('0')
                    var asked_by_rep_silver = utils.number_to_shorthand('0')
                    var asked_by_rep_bronze = utils.number_to_shorthand('0')
                    var post_tags = res.rows[i]['tags'].split('<')
                    var post_body_sample = striptags(res.rows[i]['body']).substring(0, 1000)
                    post_body_sample = post_body_sample.substring(0, 200) + ' ...'

                    // Construct HTML and fill in data from SQL Query
                    var html_votes = '<div class="question-summary"><div class="statscontainer">\
                                      <div class="stats"><div class="vote"><div class="votes">\
                                      <span class="vote-count-post high-scored-post"><strong>' +
                                      score + '</strong></span>'
                    var html_answers = '<div>votes</div></div></div><div class="status answered-accepted"><strong>' +
                                        num_answers + '</strong>answers'
                    var html_views = '</div></div><div class="views supernova" title="1,195,241 views">' +
                                      num_views + ' views'
                    var html_title = '</div></div><div class="summary"><h3><a href="' +
                                      title_link + '" class="question-hyperlink">' +
                                      title + '</a></h3>'
                    var html_body_sample = '<div class="excerpt">' + post_body_sample
                    var html_tags = '</div><div class="tags t-java t-cçç t-performance t-optimization t-branch-prediction">'
                    for (var t in post_tags) {
                        if (post_tags[t] == '')
                            continue
                        html_tags += '<a href="" class="post-tag" title="show questions tagged &#39;java&#39;" rel="tag">' +
                                     post_tags[t].split('>')[0] + '</a>'
                    }
                    var html_date_asked = '</div><div class="started fr"><div class="user-info user-hover"><div class="user-action-time">\
                                          asked <span title="2012-06-27 13:51:36Z" class="relativetime">' +
                                          date_asked + '</span>'
                    var user_image = utils.generate_user_icon(asked_by)
                    var html_asked_by = '</div><div class="user-gravatar32"><a href=""><div class="gravatar-wrapper-32">' +
                                        '<img src="data:image/bmp;base64, ' +
                                        user_image + '"/></div></a></div><div class="user-details"><a href="">' +
                                        asked_by + '</a>'
                    var html_asked_by_rep = '<div class="-flair"><span class="reputation-score" title="reputation score 282,146" \dir="ltr">' +
                                            asked_by_rep + '</span><span title="37 gold badges"><span class="badge1"></span><span class="badgecount">' +
                                            asked_by_rep_gold + '</span></span><span title="395 silver badges"><span class="badge2"></span><span class="badgecount">' +
                                            asked_by_rep_silver + '</span></span><span title="497 bronze badges"><span class="badge3"></span><span class="badgecount">' +
                                            asked_by_rep_bronze + '</span></span>'
                    var html_answer_end = '</div></div></div></div></div></div>'

                    // Send each constructed question
                    response.write(html_votes + html_answers + html_views + html_title + html_body_sample + html_tags + html_date_asked + html_asked_by + html_asked_by_rep + html_answer_end)
                }

                // Send final HTML segment
                response.write(html_page_buttons + html_end)
                response.end()
                client.end()
            })
        })
    })
}
