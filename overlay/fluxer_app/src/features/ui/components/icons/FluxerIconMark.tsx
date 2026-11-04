// SPDX-License-Identifier: AGPL-3.0-or-later

import {msg} from '@lingui/core/macro';
import type React from 'react';

export const APPLICATION_ICON_DESCRIPTOR = msg({
	message: '{productName} application icon',
	comment: 'Accessible label for the Yincord application icon.',
});

export const FluxerIconMark = (props: React.SVGProps<SVGSVGElement>) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 512 512"
		role="img"
		data-flx="ui.icons.fluxer-icon.img"
		{...props}
	>
		<circle cx={256} cy={256} r={256} fill="#181831" />
		<path fill="#84f4dc" d="M256 48a208 208 0 0 0 0 416 104 104 0 0 1 0-208 104 104 0 0 0 0-208Z" />
		<circle cx={256} cy={152} r={24} fill="#181831" />
		<circle cx={256} cy={360} r={24} fill="#84f4dc" />
	</svg>
);
