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

    const { hwid } = req.body;

    if (!hwid) {
      context.res = {
        status: 400,
        body: 'Invalid body',
      };
      return;
    }

    // strip the bearer token from the headers
    const bearer = req.headers.authorization.split(' ')[1];

    console.log('Linked HWID: ', hwid);

    // Get the ID of the user who made the request
    const { result, errorCode, data } = await verifySession(bearer);

    console.log('Result: ', result);
    console.log('Error code: ', errorCode);
    const user = data.user;
    console.log('User: ', user.email);

    if (!result) {
      context.res = {
        status: 401,
        body: errorCode,
      };
      return;
    }

    // Check if the HWID exists
    const { data: garageData, error: garageError } = await supabase
      .from('garages')
      .select('*')
      .eq('hwid', hwid);

    if (!garageData || garageData.length === 0) {
      console.error('HWID not found');
      context.res = {
        status: 500,
        body: 'Error linking',
      };
      return;
    }

    // Check if the HWID is already linked
    if (garageData[0].owner_id) {
      console.error('HWID already linked');
      context.res = {
        status: 500,
        body: 'Error linking',
      };
      return;
    }

    // Check if there was an error
    if (garageError) {
      console.error('Error:', garageError);
      context.res = {
        status: 500,
        body: 'Error linking',
      };
      return;
    }

    // Link the user to the HWID and return the edited row
    const { data: linkedGarage, error } = await supabase
      .from('garages')
      .update({ owner_id: user.id })
      .match({ hwid: hwid })
      .select();

    console.log('Linked garage: ', linkedGarage);

    if (error) {
      console.error('Error:', error);
      context.res = {
        status: 500,
        body: 'Error linking',
      };
      return;
    }

    context.res = {
      status: 200,
      body: linkedGarage,
    };
  } catch (error) {
    console.error('Error:', error);

    context.res = {
      status: 500,
      body: 'Error linking',
    };
  }
};
