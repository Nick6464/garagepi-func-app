require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { default: axios } = require('axios');

const { SUPABASE_KEY, NGROK_API_KEY, PI_API_KEY } = process.env;

const supabase = createClient(
  'https://itqtginklzbjrhusppwt.supabase.co',
  SUPABASE_KEY
);

module.exports = async function (context, req) {
  const setErrorResponse = (error) => {
    if (error) console.log('Error:', error?.status, error?.message);
    context.res = {
      status: 500,
      body: 'Error assigning token',
    };
  };

  try {
    // If the Pi's hwid is not provided, return an error
    if (!req.body || !req.body.hwid) {
      console.error('No hwid provided');
      setErrorResponse();
      return;
    }

    // If there is no API key, return an error
    if (!req.headers.authorization) {
      console.error('No API key provided');
      setErrorResponse();
      return;
    }

    // Extract the API key from the Bearer token
    const providedApiKey = req.headers.authorization.split(' ')[1];

    // If the API key doesnt match the expected API key, return an error
    if (providedApiKey !== PI_API_KEY) {
      console.error('Invalid API key');
      setErrorResponse();
      return;
    }

    // Verify the Pi is in the database
    const { hwid } = req.body;
    try {
      const { data, error } = await supabase
        .from('garages')
        .select('hwid')
        .eq('hwid', hwid);

      if (error) throw error;

      if (!data || data.length === 0) {
        setErrorResponse();
        return;
      }

      console.log('Pi found:', data[0]);
    } catch (error) {
      console.error('Error verifying Pi:', error.message);
      setErrorResponse();
      return;
    }

    // Generate a ngrok authtoken for the Pi
    const { data, error } = await generateNgrokAuthToken(hwid);

    // Extract the authtoken from the response
    if (error || !data || !data.token) {
      setErrorResponse(error);
      return;
    }

    // Return the authtoken to the Pi
    context.res = {
      status: 200,
      body: { token: data.token },
    };
  } catch (error) {
    setErrorResponse(error);
  }
};

async function generateNgrokAuthToken(hwid) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${NGROK_API_KEY}`,
    'Ngrok-Version': '2',
  };

  console.log('Generating ngrok authtoken for:', hwid);

  try {
    const { data, error } = await axios.post(
      'https://api.ngrok.com/credentials',
      { description: `hwid: ${hwid}` },
      { headers: headers }
    );

    if (error) throw error;

    console.log('Authtoken generated:', data);
    return { data };
  } catch (error) {
    console.error('Error generating ngrok authtoken:', error.message);
    return { error };
  }
}
