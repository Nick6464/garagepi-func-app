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

    const { hwid, ip } = req.body;

    if (!hwid || !ip) {
      context.res = {
        status: 400,
        body: 'Invalid body',
      };
      return;
    }

    // First try update the garage row with hwid as identifier and edit the ip_address
    const { data, error } = await supabase
      .from('garages')
      .upsert(
        { hwid: hwid, ip_address: ip, last_seen: new Date() },
        { onConflict: 'hwid' }
      )
      .select();

    console.log('Data: ', data);
    console.log('Error: ', error);

    if (error || !data || data.length === 0) {
      context.res = {
        status: 500,
        body: 'Error registering with HWID',
      };
      return;
    }

    context.res = {
      status: 200,
      body: 'HWID registered',
    };
  } catch (error) {
    console.error('Error:', error);

    context.res = {
      status: 500,
      body: 'Error registering with HWID',
    };
  }
};
