export const SquareButtonCSS = {
  backgroundColor: '#252525',
  color: '#fff',
  textTransform: 'uppercase',
  transition: 'all .15s',
  padding: '12px 30px',
  fontSize: 12,
  lineHeight: 1,
  height: 36,
  letterSpacing: '.2em',
  borderRadius: 3,
  fontWeight: 400,
  '&:hover': {
    backgroundColor: '#c59d5f',
  },
};

export const AdornedSxProps = {
  mt: 0,
  mb: 0,
  '&:before': {
    content: '""',
    position: 'absolute',
    top: '-18px',
    left: '-10px',
    right: '-18px',
    bottom: '-18px',
    border: '2px solid #c59d5f',
    borderImage: 'linear-gradient(to bottom, #c59d5f 0%, #fff 70%) 0 0 0 4',
    zIndex: 0,
  },
  '&:after': {
    position: 'absolute',
    content: '""',
    top: '-18px',
    left: '-10px',
    right: '-18px',
    bottom: '-18px',
    border: '2px solid',
    borderImage: 'linear-gradient(to right, #c59d5f 0%, #fff 90%) 1  0 0',
    zIndex: 0,
  },
};
