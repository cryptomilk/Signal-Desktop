// Copyright 2021 Signal Messenger, LLC
// SPDX-License-Identifier: AGPL-3.0-only

import type { ReactNode } from 'react';
import React, { useState } from 'react';

import { Avatar } from '../../Avatar';
import { AvatarLightbox } from '../../AvatarLightbox';
import type { ConversationType } from '../../../state/ducks/conversations';
import { Emojify } from '../Emojify';
import { GroupDescription } from '../GroupDescription';
import { About } from '../About';
import type { GroupV2Membership } from './ConversationDetailsMembershipList';
import type { LocalizerType } from '../../../types/Util';
import { bemGenerator } from './util';

export type Props = {
  canEdit: boolean;
  conversation: ConversationType;
  i18n: LocalizerType;
  isGroup: boolean;
  isMe: boolean;
  memberships: Array<GroupV2Membership>;
  startEditing: (isGroupTitle: boolean) => void;
};

const bem = bemGenerator('ConversationDetails-header');

export const ConversationDetailsHeader: React.ComponentType<Props> = ({
  canEdit,
  conversation,
  i18n,
  isGroup,
  isMe,
  memberships,
  startEditing,
}) => {
  const [showingAvatar, setShowingAvatar] = useState(false);

  let subtitle: ReactNode;
  if (isGroup) {
    if (conversation.groupDescription) {
      subtitle = (
        <GroupDescription
          i18n={i18n}
          text={conversation.groupDescription}
          title={conversation.title}
        />
      );
    } else if (canEdit) {
      subtitle = i18n('ConversationDetailsHeader--add-group-description');
    } else {
      subtitle = i18n('ConversationDetailsHeader--members', [
        memberships.length.toString(),
      ]);
    }
  } else if (!isMe) {
    subtitle = (
      <>
        <div className={bem('subtitle__about')}>
          <About text={conversation.about} />
        </div>
        <div className={bem('subtitle__phone-number')}>
          {conversation.phoneNumber}
        </div>
      </>
    );
  }

  const avatar = (
    <Avatar
      conversationType={conversation.type}
      i18n={i18n}
      size={80}
      {...conversation}
      noteToSelf={isMe}
      onClick={() => setShowingAvatar(true)}
      sharedGroupNames={[]}
    />
  );

  const contents = (
    <div>
      <div className={bem('title')}>
        <Emojify text={isMe ? i18n('noteToSelf') : conversation.title} />
      </div>
    </div>
  );

  const avatarLightbox =
    showingAvatar && !isMe ? (
      <AvatarLightbox
        avatarColor={conversation.color}
        avatarPath={conversation.avatarPath}
        conversationTitle={conversation.title}
        i18n={i18n}
        isGroup
        onClose={() => setShowingAvatar(false)}
      />
    ) : null;

  if (canEdit) {
    return (
      <div className={bem('root')}>
        {avatarLightbox}
        {avatar}
        <button
          type="button"
          onClick={ev => {
            ev.preventDefault();
            ev.stopPropagation();
            startEditing(true);
          }}
          className={bem('root', 'editable')}
        >
          {contents}
        </button>
        <button
          type="button"
          onClick={ev => {
            if (ev.target instanceof HTMLAnchorElement) {
              return;
            }

            ev.preventDefault();
            ev.stopPropagation();
            startEditing(false);
          }}
          className={bem('root', 'editable')}
        >
          <div className={bem('subtitle')}>{subtitle}</div>
        </button>
      </div>
    );
  }

  return (
    <div className={bem('root')}>
      {avatarLightbox}
      {avatar}
      {contents}
      <div className={bem('subtitle')}>{subtitle}</div>
    </div>
  );
};
