const {Pool, Client} = require('pg')
require('dotenv').config();

// const pool = new Pool({
// user: "jonathanoh",
// host: "localhost",
// database: "qna",
// password: "1234",
// port: "5432"
// });

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

pool.connect();


// QUERIES
const getQuestions = (req, res) => {

  const product_id = req.query.product_id;
  const page = req.query.page || 1;
  const count = req.query.count || 5;

  const query = {
    text: `SELECT
    product_id,
    (
      SELECT json_agg(json_build_object(
      'question_id', q.id,
      'question_body', q.body,
      'question_date', q.date,
      'asker_name', q.asker_name,
      'asker_email', q.asker_email,
      'reported', q.reported,
      'answers', (
                    SELECT json_object_agg(
                      a.id, json_build_object(
                        'id', a.id,
                        'body', a.body,
                        'date', a.date,
                        'answerer_name', a.answerer_name,
                        'helpfulness', a.helpful,
                        'photos', (
                          SELECT json_agg(json_build_object(
                            'id', ph.id,
                            'url', ph.url
                          ))
                          FROM photos ph
                          WHERE ph.answer_id = a.id
                        )
                      )
                    )
                    FROM answers a
                    WHERE a.question_id = q.id
                  )
      ))
      AS results
      FROM questions q
      WHERE id = $1
    )
    FROM questions
    WHERE id = $1
    AND reported = false
    GROUP BY product_id
    OFFSET ($2 - 1)
    LIMIT $3
    `,
    values: [product_id, page, count],
  }

  pool.query(query)
  .then(({rows}) => {
    res.status(200).json(rows[0]);
  })
  .catch(err => {
    console.log('err');
    res.status(400).send(err);
  })
}



const getAnswers = (req, res) => {
  const question_id = req.params.question_id;
  const page = (req.query.page || 1);
  const count = (req.query.count || 5);


  const query = {
    text: `
    SELECT
    a.question_id as question,
    ${page} as page,
    ${count} as count,
      (json_agg(json_build_object(
        'answer_id', a.id,
        'body', a.body,
        'date', a.date,
        'answerer_name', a.answerer_name,
        'helpfulness', a.helpful,
        'photos', (SELECT json_agg(json_build_object(
          'id', ph.id,
          'url', ph.url
        ))
        FROM photos ph
        WHERE ph.answer_id = a.id
        )
      ))
      ) AS result
    FROM answers a
    WHERE a.question_id = $1
    GROUP BY a.question_id
    OFFSET ($2 - 1)
    LIMIT $3
    `,
    values: [question_id, page, count],
  }
  pool.query(query)
  .then(({rows}) => {
    res.status(200).json(rows[0]);
  })
  .catch(err => {
    console.log(err);
    res.status(400).send(err);
  })
}

const addQuestion = (req, res) => {
  console.log(req.body);
  const {body, name, email, product_id} = req.body;
  const query = {
    text: 'INSERT INTO questions (body, asker_name, asker_email, product_id) VALUES($1, $2, $3, $4) RETURNING *',
    values: [body, name, email, product_id]
  }
  pool.query(query)
    .then(({rows}) => {
      console.log('POST')
      res.status(200).json(rows);
    })
    .catch(err => {
      console.log(err);
      res.status(400).send(err);
    })
}

const addAnswer = (req, res) => {
  const {body, name, email, photos} = req.body;
  const question_id = req.params.question_id;
  const query1 = {
    text: 'INSERT INTO answers (question_id, body, answerer_name, answerer_email) VALUES($1, $2, $3, $4)',
    values: [question_id, body, name, email]
  }

  const query2 = {
    text: `WITH ans AS (
      INSERT INTO answers
        (question_id, body, answerer_name, answerer_email)
      VALUES($1, $2, $3, $4)
      RETURNING ID
      )
      INSERT INTO photos VALUES($5, answer_id)
      `,
  values: [question_id, body, name, email, photos]
  }
  if (!photos) {
    pool.query(query1)
    .then(({rows}) => {
      console.log('POST')
      res.status(200).json(rows[0]);
    })
    .catch(err => {
      console.log(err);
      res.status(400).send(err);
    })
  } else {
    pool.query(query2)
    .then(({rows}) => {
      console.log('POST')
      res.status(200).json(rows[0]);
    })
    .catch(err => {
      console.log(err);
      res.status(400).send(err);
    })
  }
}

const updateHelpful = (req, res) => {


  const query = {
    text: 'UPDATE questions SET helpful = helpful + 1 WHERE id = $1',
    values: [req.params.question_id]
  }

  pool.query(query)
    .then(() => {
      res.status(204).send();
    })
    .catch((err) => {
      console.log(err.stack);
      res.status(400).send();
    })
}

const updateReported = (req, res) => {

  const query = {
    text: 'UPDATE questions SET reported = NOT reported WHERE id = $1',
    values: [req.params.question_id]
  }

  pool.query(query)
    .then(() => {
      res.status(204).send();
    })
    .catch((err) => {
      console.log(err.stack);
      res.status(400).send();
    })
}

const updateAnswerHelpful = (req, res) => {

  const query = {
    text: 'UPDATE answers SET helpful = helpful + 1 WHERE id = $1',
    values: [req.params.answer_id]
  }

  pool.query(query)
    .then(() => {
      res.status(204).send();
    })
    .catch((err) => {
      console.log(err.stack);
      res.status(400).send();
    })
}

const updateAnswerReported = (req, res) => {

  const query = {
    text: 'UPDATE answers SET reported = NOT reported WHERE id = $1',
    values: [req.params.answer_id]
  }

  pool.query(query)
    .then(() => {
      res.status(204).send();
    })
    .catch((err) => {
      console.log(err.stack);
      res.status(400).send();
    })
}

module.exports = {
  getQuestions,
  getAnswers,
  addQuestion,
  addAnswer,
  updateHelpful,
  updateReported,
  updateAnswerHelpful,
  updateAnswerReported
}

// module.export = pool;

