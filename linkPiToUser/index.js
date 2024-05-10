require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

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

    const { linkedHwid } = req.body;

    if (!linkedHwid) {
      context.res = {
        status: 400,
        body: 'Invalid body',
      };
      return;
    }

    // Get the ID of the user who made the request
    const { result, errorCode, user } = await supabase.auth.api.getUserByCookie(
      req.headers.cookie
    );

    if (!result) {
      context.res = {
        status: 401,
        body: errorCode,
      };
      return;
    }

    console.log('User: ', user);

    // First try update the garage row with hwid as identifier and edit the ip_address
    const { data, error } = await supabase
      .from('garages')
      .update({ ip_address: ip })
      .match({ hwid: hwid });

    if (error) {
      const { data, error } = await supabase
        .from('garages')
        .insert({ hwid: hwid, ip_address: ip });

      if (error) {
        context.res = {
          status: 500,
          body: 'Error registering with HWID',
        };
        return;
      }
    }

    context.res = {
      status: 200,
      body: 'Pi linked',
    };
  } catch (error) {
    console.error('Error:', error);

    context.res = {
      status: 500,
      body: 'Error linking',
    };
  }
};
