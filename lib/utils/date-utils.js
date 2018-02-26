import moment from 'moment';

export const formatTimestamp = unixTime =>
  moment.unix(unixTime).format('MMM D, YYYY h:mm a');
