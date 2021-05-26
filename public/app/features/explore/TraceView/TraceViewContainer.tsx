import React from 'react';
import { Collapse } from '@grafana/ui';
import { DataFrame } from '@grafana/data';
import { TraceView } from './TraceView';
import { ExploreId, SplitOpen } from '../../../types';

interface Props {
  dataFrames: DataFrame[];
  splitOpenFn: SplitOpen;
  exploreId: ExploreId;
}
export function TraceViewContainer(props: Props) {
  const { dataFrames, splitOpenFn, exploreId } = props;

  return (
    <Collapse label="Trace View" isOpen>
      <TraceView exploreId={exploreId} dataFrames={dataFrames} splitOpenFn={splitOpenFn} />
    </Collapse>
  );
}
