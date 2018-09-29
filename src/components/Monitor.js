//@flow
import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { withStyles } from '@material-ui/core/styles';
import {
  Avatar,
  Typography,
  Paper,
  Button,
  Tooltip,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar
} from '@material-ui/core';
import {
  ArrowBack,
  ArrowForward,
  Done as VoteIcon,
  Home as HomeIcon
} from '@material-ui/icons';

import { database } from '../services';
import { getResults } from '../lib/voteCounter';
import Candidate from './chart/Candidate';
import type { Results } from '../lib/voteTypes';

const finishLIne =
  'repeating-linear-gradient(to top, #fff, #fff 3%, #76911d 3%, #76911d 10%)';

const styles = theme => {
  return {
    wrapper: {
      display: 'flex',
      alignItems: 'top',
      justifyContent: 'center',
      height: '80vh'
    },
    splitWrapper: { display: 'flex', justifyContent: 'space-between' },
    results: { width: '100%' },
    chartHeader: {
      background: 'transparent',
      height: '5vh'
    },
    chartLabel: { transform: 'translate(-50%, 0)' },
    chart: {
      display: 'flex'
    },
    bars: {
      width: '100%'
    },
    candidateName: {
      textAlign: 'right',
      height: '10vh'
    },
    diamond: {
      height: '3.5vh',
      width: '3.5vh',
      transform: 'rotate(45deg)',
      backgroundColor: 'blue'
    }
  };
};

type Props = {
  match: {
    params: {
      key: string,
      round: string
    }
  },
  classes: Object
};

type State = {
  election?: Object,
  candidates?: Array<Object>,
  votes?: Array<any>,
  results?: Results
};

class Monitor extends Component<Props, State> {
  state = {};

  candidateColors = [
    '#F1CB21',
    '#FF6600',
    '#EC2127',
    '#272361',
    'purple',
    'cyan',
    'magenta',
    'darkGrey',
    'brown',
    'pink'
  ];

  componentDidMount() {
    const { key } = this.props.match.params;
    database.ref(`elections/${key}`).once('value', snapshot => {
      const election = snapshot.val();
      election.id = key;

      this.setState({ election });

      database.ref(`candidates/${key}`).once('value', snapshot => {
        const candidatesData = snapshot.val();
        const candidateIds = Object.keys(candidatesData);
        const candidatesArray = candidateIds.map((key, index) => ({
          id: key,
          name: candidatesData[key].name
        }));

        this.setState({
          candidates: candidatesArray
        });

        //Re-runs the election on every vote. Throttle this ?
        database.ref(`votes/${key}`).on('value', snapshot => {
          if (snapshot.val()) {
            const votes = Object.values(snapshot.val());
            const results = getResults(
              votes,
              candidatesArray.map(c => c.id),
              election.numberOfWinners
            );
            console.log('setting state votes', votes, results);
            this.setState({ votes, results });
          }
        });
      });
    });
  }

  render() {
    const { election, votes, candidates, results } = this.state;

    if (!(election && candidates && votes && results))
      return <Typography>Loading...</Typography>;

    const firstTotals = results.rounds[0].totals;
    const sortedCandidates = candidates
      .concat()
      .sort((a, b) => firstTotals[b.id] - firstTotals[a.id]);
    const {
      classes,
      match: {
        params: { key, round }
      }
    } = this.props;
    const numberOfWinners = election.numberOfWinners || 1;
    const roundInt = parseInt(round, 10);
    const graphWidthInVotes = results.rounds.reduce((max, round) => {
      console.log('round.totals', round.totals);
      Object.values(round.totals).forEach(value => {
        if (value > max) max = value;
      });
      return max;
    }, 0);
    const thisRound = results.rounds[roundInt - 1];
    const totalVotes = thisRound.validVoteCount;
    const votesToWin = totalVotes / (numberOfWinners + 1);
    const nextRound = roundInt + 1;
    const lostVotes = votes.length - totalVotes;
    // prettier-ignore
    const scalar = (10 * totalVotes) / graphWidthInVotes;
    // prettier-ignore
    const graphRulesGradient = `repeating-linear-gradient(to right, #BBB, #BBB 1px, transparent 1px, transparent ${scalar}%)`;
    const colorMap = {};

    sortedCandidates.forEach(
      (candidate, i) => (colorMap[candidate.id] = this.candidateColors[i])
    );

    const allWinners = thisRound.winners.concat(thisRound.previousWinners);
    const isWinner = candidate => allWinners.includes(candidate.id);

    const getSecondaryText = candidate => {
      if (isWinner(candidate)) return 'Winner';
      if (thisRound.previousLosers.includes(candidate.id)) return 'Eliminated';
      return `${Math.round(
        (thisRound.totals[candidate.id] / totalVotes) * 100
      )}% (${+thisRound.totals[candidate.id].toFixed(2)} votes)`;
    };

    const victoryPercentage = 1 / (numberOfWinners + 1);

    return (
      <div className={classes.wrapper}>
        <Tooltip title="Previous Round">
          <Button
            disabled={roundInt === 1}
            variant="raised"
            component={Link}
            to={`/monitor/${key}/round/1`}
          >
            <ArrowBack className={classes.chartIcon} color="primary" />
          </Button>
        </Tooltip>
        <div className={classes.results}>
          <Typography variant="title" align="center" gutterBottom>
            {election.title} - Round {round}
          </Typography>
          <div className={classes.splitWrapper}>
            <Tooltip title="Dashboard">
              <Avatar component={Link} to={`/`}>
                <HomeIcon className={classes.chartIcon} color="primary" />
              </Avatar>
            </Tooltip>
            <Tooltip title="Vote">
              <Avatar component={Link} to={`/vote/${election.id}`}>
                <VoteIcon color="primary" />
              </Avatar>
            </Tooltip>
          </div>
          <div className={classes.chart}>
            <Paper className={classes.candidateList}>
              <Typography
                variant="caption"
                style={{ height: '5vh', background: 'transparent' }}
              />
              <List>
                {sortedCandidates.map(candidate => (
                  <ListItem className={classes.candidateName}>
                    <ListItemAvatar>
                      <div
                        className={classes.diamond}
                        style={{
                          backgroundColor: colorMap[candidate.id]
                        }}
                      />
                    </ListItemAvatar>
                    <ListItemText
                      primary={candidate.name}
                      primaryTypographyProps={{ noWrap: true }}
                      secondary={getSecondaryText(candidate)}
                      secondaryTypographyProps={{ noWrap: true }}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
            <div className={classes.bars}>
              <Paper className={classes.chartHeader}>
                <Chip
                  className={classes.chartLabel}
                  label={`${Math.round(
                    victoryPercentage * 100
                  )}% (${votesToWin} votes)`}
                  style={{ marginLeft: `${victoryPercentage * 10 * scalar}%` }}
                />
              </Paper>
              <Paper
                style={{
                  width: '100%',
                  // prettier-ignore
                  backgroundImage: graphRulesGradient + ', ' + finishLIne,
                  // prettier-ignore
                  backgroundPosition: `left, ${victoryPercentage * 10 * scalar + 0.5}%`,
                  // prettier-ignore
                  backgroundRepeat: 'no-repeat, no-repeat',
                  backgroundSize: 'contain, 0.5% 100%',
                  paddingBottom: '3vh'
                }}
                elevation={8}
              >
                {sortedCandidates.map(candidate => {
                  const segments = thisRound.segments[candidate.id];
                  const total = thisRound.totals[candidate.id];
                  return (
                    <Candidate
                      key={candidate.id}
                      graphWidthInVotes={graphWidthInVotes}
                      voteSegments={segments}
                      totalVotesForCandidate={total}
                      percentageOfWin={(total / votesToWin) * 100}
                      candidate={candidate}
                      colorMap={colorMap || {}}
                      winner={results.winners.includes(candidate.id)}
                      loser={thisRound.previousLosers.includes(candidate.id)}
                    />
                  );
                })}
              </Paper>
            </div>
          </div>
          <Typography>Inactive Ballots</Typography>
          <Typography variant="caption">(no candidate choices left)</Typography>
          <Typography>{lostVotes} votes</Typography>
        </div>
        <Tooltip title="Next Round">
          <Button
            disabled={allWinners.length >= numberOfWinners}
            variant="raised"
            component={Link}
            to={`/monitor/${key}/round/${nextRound}`}
          >
            <ArrowForward className={classes.chartIcon} color="primary" />
          </Button>
        </Tooltip>
      </div>
    );
  }
}

export default withStyles(styles)(Monitor);
