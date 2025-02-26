// Copyright 2021 Signal Messenger, LLC
// SPDX-License-Identifier: AGPL-3.0-only

import React, { useCallback, useEffect, useRef, useState } from 'react';

import type { AvatarColorType } from '../types/Colors';
import { AvatarColors } from '../types/Colors';
import type {
  AvatarDataType,
  DeleteAvatarFromDiskActionType,
  ReplaceAvatarActionType,
  SaveAvatarToDiskActionType,
} from '../types/Avatar';
import { AvatarEditor } from './AvatarEditor';
import { AvatarPreview } from './AvatarPreview';
import { Button, ButtonVariant } from './Button';
import { ConfirmDiscardDialog } from './ConfirmDiscardDialog';
import { Emoji } from './emoji/Emoji';
import type { Props as EmojiButtonProps } from './emoji/EmojiButton';
import { EmojiButton } from './emoji/EmojiButton';
import type { EmojiPickDataType } from './emoji/EmojiPicker';
import { Input } from './Input';
import { Intl } from './Intl';
import type { LocalizerType } from '../types/Util';
import { Modal } from './Modal';
import { PanelRow } from './conversation/conversation-details/PanelRow';
import type { ProfileDataType } from '../state/ducks/conversations';
import { getEmojiData, unifiedToEmoji } from './emoji/lib';
import { missingCaseError } from '../util/missingCaseError';

export enum EditState {
  None = 'None',
  BetterAvatar = 'BetterAvatar',
  ProfileName = 'ProfileName',
  Bio = 'Bio',
}

type PropsExternalType = {
  onEditStateChanged: (editState: EditState) => unknown;
  onProfileChanged: (
    profileData: ProfileDataType,
    avatarBuffer?: Uint8Array
  ) => unknown;
};

export type PropsDataType = {
  aboutEmoji?: string;
  aboutText?: string;
  avatarPath?: string;
  color?: AvatarColorType;
  conversationId: string;
  familyName?: string;
  firstName: string;
  i18n: LocalizerType;
  userAvatarData: Array<AvatarDataType>;
} & Pick<EmojiButtonProps, 'recentEmojis' | 'skinTone'>;

type PropsActionType = {
  deleteAvatarFromDisk: DeleteAvatarFromDiskActionType;
  onSetSkinTone: (tone: number) => unknown;
  replaceAvatar: ReplaceAvatarActionType;
  saveAvatarToDisk: SaveAvatarToDiskActionType;
};

export type PropsType = PropsDataType & PropsActionType & PropsExternalType;

type DefaultBio = {
  i18nLabel: string;
  shortName: string;
};

const DEFAULT_BIOS: Array<DefaultBio> = [
  {
    i18nLabel: 'Bio--speak-freely',
    shortName: 'wave',
  },
  {
    i18nLabel: 'Bio--encrypted',
    shortName: 'zipper_mouth_face',
  },
  {
    i18nLabel: 'Bio--free-to-chat',
    shortName: '+1',
  },
  {
    i18nLabel: 'Bio--coffee-lover',
    shortName: 'coffee',
  },
  {
    i18nLabel: 'Bio--taking-break',
    shortName: 'mobile_phone_off',
  },
];

export const ProfileEditor = ({
  aboutEmoji,
  aboutText,
  avatarPath,
  color,
  conversationId,
  deleteAvatarFromDisk,
  familyName,
  firstName,
  i18n,
  onEditStateChanged,
  onProfileChanged,
  onSetSkinTone,
  recentEmojis,
  replaceAvatar,
  saveAvatarToDisk,
  skinTone,
  userAvatarData,
}: PropsType): JSX.Element => {
  const focusInputRef = useRef<HTMLInputElement | null>(null);
  const [editState, setEditState] = useState<EditState>(EditState.None);
  const [confirmDiscardAction, setConfirmDiscardAction] = useState<
    (() => unknown) | undefined
  >(undefined);

  // This is here to avoid component re-render jitters in the time it takes
  // redux to come back with the correct state
  const [fullName, setFullName] = useState({
    familyName,
    firstName,
  });
  const [fullBio, setFullBio] = useState({
    aboutEmoji,
    aboutText,
  });

  const [avatarBuffer, setAvatarBuffer] = useState<Uint8Array | undefined>(
    undefined
  );
  const [stagedProfile, setStagedProfile] = useState<ProfileDataType>({
    aboutEmoji,
    aboutText,
    familyName,
    firstName,
  });

  const handleBack = useCallback(() => {
    setEditState(EditState.None);
    onEditStateChanged(EditState.None);
  }, [setEditState, onEditStateChanged]);

  const setAboutEmoji = useCallback(
    (ev: EmojiPickDataType) => {
      const emojiData = getEmojiData(ev.shortName, skinTone);
      setStagedProfile(profileData => ({
        ...profileData,
        aboutEmoji: unifiedToEmoji(emojiData.unified),
      }));
    },
    [setStagedProfile, skinTone]
  );

  const handleAvatarChanged = useCallback(
    (avatar: Uint8Array | undefined) => {
      setAvatarBuffer(avatar);
      setEditState(EditState.None);
      onProfileChanged(stagedProfile, avatar);
    },
    [onProfileChanged, stagedProfile]
  );

  const getFullNameText = () => {
    return [fullName.firstName, fullName.familyName].filter(Boolean).join(' ');
  };

  useEffect(() => {
    const focusNode = focusInputRef.current;
    if (!focusNode) {
      return;
    }

    focusNode.focus();
    focusNode.setSelectionRange(focusNode.value.length, focusNode.value.length);
  }, [editState]);

  useEffect(() => {
    onEditStateChanged(editState);
  }, [editState, onEditStateChanged]);

  const handleAvatarLoaded = useCallback(avatar => {
    setAvatarBuffer(avatar);
  }, []);

  let content: JSX.Element;

  if (editState === EditState.BetterAvatar) {
    content = (
      <AvatarEditor
        avatarColor={color || AvatarColors[0]}
        avatarPath={avatarPath}
        avatarValue={avatarBuffer}
        conversationId={conversationId}
        conversationTitle={getFullNameText()}
        deleteAvatarFromDisk={deleteAvatarFromDisk}
        i18n={i18n}
        onCancel={handleBack}
        onSave={handleAvatarChanged}
        userAvatarData={userAvatarData}
        replaceAvatar={replaceAvatar}
        saveAvatarToDisk={saveAvatarToDisk}
      />
    );
  } else if (editState === EditState.ProfileName) {
    const shouldDisableSave =
      !stagedProfile.firstName ||
      (stagedProfile.firstName === fullName.firstName &&
        stagedProfile.familyName === fullName.familyName);

    content = (
      <>
        <Input
          i18n={i18n}
          maxLengthCount={26}
          maxByteCount={128}
          whenToShowRemainingCount={0}
          onChange={newFirstName => {
            setStagedProfile(profileData => ({
              ...profileData,
              firstName: String(newFirstName),
            }));
          }}
          placeholder={i18n('ProfileEditor--first-name')}
          ref={focusInputRef}
          value={stagedProfile.firstName}
        />
        <Input
          i18n={i18n}
          maxLengthCount={26}
          maxByteCount={128}
          whenToShowRemainingCount={0}
          onChange={newFamilyName => {
            setStagedProfile(profileData => ({
              ...profileData,
              familyName: newFamilyName,
            }));
          }}
          placeholder={i18n('ProfileEditor--last-name')}
          value={stagedProfile.familyName}
        />
        <Modal.ButtonFooter>
          <Button
            onClick={() => {
              const handleCancel = () => {
                handleBack();
                setStagedProfile(profileData => ({
                  ...profileData,
                  familyName,
                  firstName,
                }));
              };

              const hasChanges =
                stagedProfile.familyName !== fullName.familyName ||
                stagedProfile.firstName !== fullName.firstName;
              if (hasChanges) {
                setConfirmDiscardAction(() => handleCancel);
              } else {
                handleCancel();
              }
            }}
            variant={ButtonVariant.Secondary}
          >
            {i18n('cancel')}
          </Button>
          <Button
            disabled={shouldDisableSave}
            onClick={() => {
              if (!stagedProfile.firstName) {
                return;
              }
              setFullName({
                firstName: stagedProfile.firstName,
                familyName: stagedProfile.familyName,
              });

              onProfileChanged(stagedProfile, avatarBuffer);
              handleBack();
            }}
          >
            {i18n('save')}
          </Button>
        </Modal.ButtonFooter>
      </>
    );
  } else if (editState === EditState.Bio) {
    const shouldDisableSave =
      stagedProfile.aboutText === fullBio.aboutText &&
      stagedProfile.aboutEmoji === fullBio.aboutEmoji;

    content = (
      <>
        <Input
          expandable
          hasClearButton
          i18n={i18n}
          icon={
            <div className="module-composition-area__button-cell">
              <EmojiButton
                closeOnPick
                emoji={stagedProfile.aboutEmoji}
                i18n={i18n}
                onPickEmoji={setAboutEmoji}
                onSetSkinTone={onSetSkinTone}
                recentEmojis={recentEmojis}
                skinTone={skinTone}
              />
            </div>
          }
          maxLengthCount={140}
          maxByteCount={512}
          moduleClassName="ProfileEditor__about-input"
          onChange={value => {
            if (value) {
              setStagedProfile(profileData => ({
                ...profileData,
                aboutEmoji: stagedProfile.aboutEmoji,
                aboutText: value.replace(/(\r\n|\n|\r)/gm, ''),
              }));
            } else {
              setStagedProfile(profileData => ({
                ...profileData,
                aboutEmoji: undefined,
                aboutText: '',
              }));
            }
          }}
          ref={focusInputRef}
          placeholder={i18n('ProfileEditor--about-placeholder')}
          value={stagedProfile.aboutText}
          whenToShowRemainingCount={40}
        />

        {DEFAULT_BIOS.map(defaultBio => (
          <PanelRow
            className="ProfileEditor__row"
            key={defaultBio.shortName}
            icon={
              <div className="ProfileEditor__icon--container">
                <Emoji shortName={defaultBio.shortName} size={24} />
              </div>
            }
            label={i18n(defaultBio.i18nLabel)}
            onClick={() => {
              const emojiData = getEmojiData(defaultBio.shortName, skinTone);

              setStagedProfile(profileData => ({
                ...profileData,
                aboutEmoji: unifiedToEmoji(emojiData.unified),
                aboutText: i18n(defaultBio.i18nLabel),
              }));
            }}
          />
        ))}

        <Modal.ButtonFooter>
          <Button
            onClick={() => {
              const handleCancel = () => {
                handleBack();
                setStagedProfile(profileData => ({
                  ...profileData,
                  ...fullBio,
                }));
              };

              const hasChanges =
                stagedProfile.aboutText !== fullBio.aboutText ||
                stagedProfile.aboutEmoji !== fullBio.aboutEmoji;
              if (hasChanges) {
                setConfirmDiscardAction(() => handleCancel);
              } else {
                handleCancel();
              }
            }}
            variant={ButtonVariant.Secondary}
          >
            {i18n('cancel')}
          </Button>
          <Button
            disabled={shouldDisableSave}
            onClick={() => {
              setFullBio({
                aboutEmoji: stagedProfile.aboutEmoji,
                aboutText: stagedProfile.aboutText,
              });

              onProfileChanged(stagedProfile, avatarBuffer);
              handleBack();
            }}
          >
            {i18n('save')}
          </Button>
        </Modal.ButtonFooter>
      </>
    );
  } else if (editState === EditState.None) {
    content = (
      <>
        <AvatarPreview
          avatarColor={color}
          avatarPath={avatarPath}
          avatarValue={avatarBuffer}
          conversationTitle={getFullNameText()}
          i18n={i18n}
          isEditable
          onAvatarLoaded={handleAvatarLoaded}
          onClick={() => {
            setEditState(EditState.BetterAvatar);
          }}
          style={{
            height: 80,
            width: 80,
          }}
        />

        <hr className="ProfileEditor__divider" />

        <PanelRow
          className="ProfileEditor__row"
          icon={
            <i className="ProfileEditor__icon--container ProfileEditor__icon ProfileEditor__icon--name" />
          }
          label={getFullNameText()}
          onClick={() => {
            setEditState(EditState.ProfileName);
          }}
        />

        <PanelRow
          className="ProfileEditor__row"
          icon={
            fullBio.aboutEmoji ? (
              <div className="ProfileEditor__icon--container">
                <Emoji emoji={fullBio.aboutEmoji} size={24} />
              </div>
            ) : (
              <i className="ProfileEditor__icon--container ProfileEditor__icon ProfileEditor__icon--bio" />
            )
          }
          label={fullBio.aboutText || i18n('ProfileEditor--about')}
          onClick={() => {
            setEditState(EditState.Bio);
          }}
        />

        <hr className="ProfileEditor__divider" />

        <div className="ProfileEditor__info">
          <Intl
            i18n={i18n}
            id="ProfileEditor--info"
            components={{
              learnMore: (
                <a
                  href="https://support.signal.org/hc/en-us/articles/360007459591"
                  target="_blank"
                  rel="noreferrer"
                >
                  {i18n('ProfileEditor--learnMore')}
                </a>
              ),
            }}
          />
        </div>
      </>
    );
  } else {
    throw missingCaseError(editState);
  }

  return (
    <>
      {confirmDiscardAction && (
        <ConfirmDiscardDialog
          i18n={i18n}
          onDiscard={confirmDiscardAction}
          onClose={() => setConfirmDiscardAction(undefined)}
        />
      )}
      <div className="ProfileEditor">{content}</div>
    </>
  );
};
