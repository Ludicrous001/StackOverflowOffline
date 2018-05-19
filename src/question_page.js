
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

    // Connect to the database
    client.connect(function(err, callback) {
        if (handle_error(response, err))
            return

        // Load CSS and html template
        fs.readFile('./primary.css', function (err, css) {
            fs.readFile('./question_page.html', function (err, question_template_page) {

                // The default page is the list of all questions sorted by score
                var sql_query = ''
                if (search_terms == null) {
                    sql_query = 'SELECT * FROM posts WHERE title IS NOT NULL ORDER BY score DESC LIMIT ' + questions_per_page + ' OFFSET ' + questions_per_page*page_number
                }

                // If the user has typed in search terms, require all search terms to be in the title
                // TODO: optimize
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

                // Query the databse for the proper list of questions
                client.query(sql_query, (err, query_result) => {
                    if (handle_error(response, err))
                        return

                    question_template_page = question_template_page.toString()
                    question_template_page = question_template_page.split("ZZZ_QUESTIONS_ZZZ")
                    var html_start = question_template_page[0]
                    var html_questions = question_template_page[1]
                    var html_end = question_template_page[2]

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

                    html_start = html_start.replace(/{XXX_CSS_XXX}/g, css)
                    html_start = html_start.replace(/XXX_FIRST_PAGE_XXX/g, first_page)
                    html_start = html_start.replace(/XXX_PREVIOUS_PAGE_XXX/g, previous_page)
                    html_start = html_start.replace(/XXX_NEXT_PAGE_XXX/g, next_page)

                    response.write(html_start)

                    // Construct questions to display on the HTML homepage
                    for(var i = 0; i < questions_per_page; i++) {
                        var question = html_questions
                        var title = escape_html(query_result.rows[i]['title'])
                        var title_link = 'question' + query_result.rows[i]['id']
                        var score = query_result.rows[i]['score']
                        var num_answers = query_result.rows[i]['answercount']
                        var num_views = utils.number_to_shorthand(query_result.rows[i]['viewcount'])
                        var date_asked = query_result.rows[i]['creationdate']
                        var asked_by = query_result.rows[i]['owneruserid']
                        var user_image = utils.generate_user_icon(asked_by)
                        var asked_by_rep = utils.number_to_shorthand('0')
                        var asked_by_rep_gold = utils.number_to_shorthand('0')
                        var asked_by_rep_silver = utils.number_to_shorthand('0')
                        var asked_by_rep_bronze = utils.number_to_shorthand('0')
                        var post_tags = query_result.rows[i]['tags'].split('<')
                        var post_body_sample = striptags(query_result.rows[i]['body']).substring(0, 1000)
                        post_body_sample = post_body_sample.substring(0, 200) + ' ...'

                        question = question.replace(/XXX_QUESTION_SCORE_XXX/g, score)
                        question = question.replace(/XXX_NUM_ANSWERS_XXX/g, num_answers)
                        question = question.replace(/XXX_NUM_VIEWS_XXX/g, num_views)
                        question = question.replace(/XXX_TITLE_LINK_XXX/g, title_link)
                        question = question.replace(/XXX_QUESTION_TITLE_XXX/g, title)
                        question = question.replace(/XXX_BODY_SAMPLE_XXX/g, post_body_sample)
                        question = question.replace(/XXX_DATE_ASKED_XXX/g, date_asked)
                        question = question.replace(/XXX_ASKER_ICON_XXX/g, user_image)
                        question = question.replace(/XXX_ASKER_NAME_XXX/g, asked_by)
                        question = question.replace(/XXX_ASKER_REP_XXX/g, asked_by_rep)
                        question = question.replace(/XXX_ASKER_REP_GOLD_XXX/g, asked_by_rep_gold)
                        question = question.replace(/XXX_ASKER_REP_SILVER_XXX/g, asked_by_rep_silver)
                        question = question.replace(/XXX_ASKER_REP_BRONZE_XXX/g, asked_by_rep_bronze)

                        var html_split = question.split("ZZZ_TAGS_ZZZ")
                        question = html_split[0]
                        for (var t in post_tags) {
                            var html_question_tag = html_split[1]
                            if (post_tags[t] == '')
                                continue
                            post_tags[t] = post_tags[t].substring(0, post_tags[t].length - 1);
                            html_question_tag = html_question_tag.replace(/XXX_QUESTION_TAG_XXX/g, post_tags[t])
                            question += html_question_tag
                        }
                        question += html_split[2]
                        response.write(question)
                    }

                    response.write(html_end)
                    response.end()
                    client.end()
                })
            })
        })
    })
}
