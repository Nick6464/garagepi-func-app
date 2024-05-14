require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { verifySession } = require('../supabaseAuth');

const { SUPABASE_KEY } = process.env;

const supabase = createClient(
  'https://itqtginklzbjrhusppwt.supabase.co',
  SUPABASE_KEY
);

module.exports = async function (context, req) {
  try {
    if (req.method !== 'POST') {
      context.res = {
        status: 405,
        body: 'Method Not Allowed',
      };
      return;
    }

    if (!req.body) {
      context.res = {
        status: 400,
        body: 'Body required',
      };
      return;
    }

    const { hwid, email } = req.body;

    if (!hwid || !email) {
      context.res = {
        status: 400,
        body: 'Invalid body',
      };
      return;
    }

    // strip the bearer token from the headers
    const bearer = req.headers.authorization.split(' ')[1];

    // Get the ID of the user who made the request
    const { result, errorCode, data } = await verifySession(bearer);

    const user = data.user;

    if (!result) {
      context.res = {
        status: 401,
        body: errorCode,
      };
      return;
    }

    // Check if the id of the user matches the Pi's owner
    const { data: garageData, error: garageError } = await supabase
      .from('garages')
      .select('*')
      .eq('hwid', hwid)
      .eq('owner_id', user.id);

    if (garageError) {
      context.res = {
        status: 500,
        body: 'Error fetching garage data',
      };
      return;
    }

    if (!garageData || garageData.length === 0) {
      context.res = {
        status: 401,
        body: 'Unauthorized',
      };
      return;
    }

    console.log('Garage Data: ', garageData);

    let newEmails = garageData[0].allowed_emails || [];
    // Check if the email is already in the allowed_emails array
    if (newEmails.includes(email)) {
      console.error('Email already has access');
      context.res = {
        status: 400,
        body: 'Email already has access',
      };
      return;
    }

    newEmails.push(email);

    // Add the email of the user to the allowed_emails array
    const { error: updateError, data: updateData } = await supabase
      .from('garages')
      .update([{ allowed_emails: newEmails }])
      .match({ hwid: hwid })
      .select();

    console.log('updateData: ', updateData);

    if (updateError) {
      console.error(
        'Error adding email to allowed_emails array: ',
        updateError
      );

      context.res = {
        status: 500,
        body: 'Error sharing access',
      };
      return;
    }

    console.log('Email added to allowed_emails array');

    // Send an email to the invited user
    const { data: emailData, error } =
      await supabase.auth.admin.inviteUserByEmail(email);

    if (error) {
      console.error('Error sending email:', error);
      context.res = {
        status: 500,
        body: 'Error sending email',
      };
      return;
    }

    console.log('Email Sent');

    context.res = {
      status: 200,
      body: 'Shared access',
    };
  } catch (error) {
    console.error('Error:', error);

    context.res = {
      status: 500,
      body: 'Error sharing access',
    };
  }
};
