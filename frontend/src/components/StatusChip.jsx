import { Chip } from '@mui/material';

const STATUS_COLORS = {
  'Interested': 'success',
  'Not Interested': 'error',
  'Follow Up': 'warning',
  'Answered': 'success',
  'Not Answered': 'warning',
  'Need to Call': 'info',
  'Installed': 'success',
  'No Response': 'default',
};

const StatusChip = ({ status }) => {
  const s = status || 'Follow Up';
  return <Chip label={s} size="small" color={STATUS_COLORS[s] || 'default'} sx={{ fontSize: { xs: '0.65rem' }, height: { xs: 24 }, '& .MuiChip-label': { px: { xs: 1, sm: 1.5 } } }} />;
};

export default StatusChip;
