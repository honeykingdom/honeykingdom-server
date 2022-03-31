import assert from 'assert';
import applyChanges from './apply-changes';

(() => {
  const getOptDr = (n) => ({
    O: [null, '', '', '', n, '', '', '', null, '', '', '', '', '', '', null],
    OC: [`${n}`],
  });

  const feed = {
    opt: {
      data: {
        DR: Array.from({ length: 20 }, (_, i) => getOptDr(i + 1)),
      },
      seq: 0,
      T: 0,
      TY: 'Optimized',
    },
  };

  const result = applyChanges(feed, {
    opt: {
      data: {
        DR: {
          0: {
            O: {
              2: 'PPWW.WWWWW',
              5: '34.913',
            },
          },
        },
      },
      seq: 3067,
      T: 63783997822589,
      _deleted: ['TY'],
    },
  });

  assert(result.opt.data.DR[0].O[2] === 'PPWW.WWWWW');
  assert(result.opt.data.DR[0].O[5] === '34.913');
  assert(result.opt.seq === 3067);
  assert(result.opt.T === 63783997822589);
  assert(result.opt.TY === undefined);
})();

(() => {
  const feed = {
    Scores: {
      graph: {
        Steering: {},
        GforceLat: {},
        GforceLong: {},
        Brake: {},
        Performance: {},
        Throttle: {},
        TrackStatus: ['0', ''],
        xtitle: 'Lap',
        ytitle: 'Score',
        ztitle: 'Driver',
      },
    },
  };

  const result = applyChanges(feed, {
    Scores: {
      graph: {
        Steering: {
          pNOR: { 1: 19 },
          pLAT: { 1: 31 },
        },
        GforceLat: {
          pMAG: { 1: 70 },
          pVER: { 1: 66 },
        },
      },
    },
  });

  // TODO:
  // assert(Array.isArray(result.Scores.graph.Steering.pNOR));
  // assert(result.Scores.graph.Steering.pNOR[0] === 0);
  // assert(result.Scores.graph.Steering.pNOR[1] === 19);

  // assert(Array.isArray(result.Scores.graph.Steering.pLAT));
  // assert(result.Scores.graph.Steering.pLAT[0] === 0);
  // assert(result.Scores.graph.Steering.pLAT[1] === 31);

  // assert(Array.isArray(result.Scores.graph.GforceLat.pMAG));
  // assert(result.Scores.graph.GforceLat.pMAG[0] === 0);
  // assert(result.Scores.graph.GforceLat.pMAG[1] === 70);

  // assert(Array.isArray(result.Scores.graph.GforceLat.pVER));
  // assert(result.Scores.graph.GforceLat.pVER[0] === 0);
  // assert(result.Scores.graph.GforceLat.pVER[1] === 66);
})();
