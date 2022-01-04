import { getAge } from 'src/lib';
import { Table, Tag } from 'antd';
import { IPerformer } from 'src/interfaces';
import React from 'react';
import Button from './button-update-status-member';

interface IProps {
  placeholderAvatarUrl?: string;
  data: IPerformer[];
  searching: boolean;
  // pagination?: any;
  pageSize: number;
  total: number;
  updateMemberStatus: Function;
  onChange(pagination, filters, sorter, extra): Function;
}

const StudioModelsTable = ({
  data,
  searching,
  total,
  pageSize,
  updateMemberStatus,
  onChange,
  placeholderAvatarUrl
}: IProps) => {
  const columns = [
    {
      title: 'Avatar',
      key: 'avatar',
      dataIndex: 'avatar',
      render(avatar: string) {
        return (
          <img src={avatar || placeholderAvatarUrl || '/no-avatar.png'} style={{ width: '100px ' }} alt="" />
        );
      }
    },
    {
      title: 'Email',
      key: 'email',
      dataIndex: 'email'
    },
    {
      title: 'Username',
      key: 'username',
      dataIndex: 'username'
    },
    {
      title: 'Age',
      key: 'age',
      dataIndex: 'dateOfBirth',
      render: (dateOfBirth) => getAge(dateOfBirth)
    },
    {
      title: 'Gender',
      key: 'gender',
      dataIndex: 'gender'
    },
    {
      title: 'Country',
      key: 'country',
      dataIndex: 'country'
    },
    // {
    //   title: 'Total Stream Time',
    //   key: 'totalStreamTime',
    //   render(record) {
    //     return <span>{converDuration(record.stats.totalStreamTime)}</span>;
    //   }
    // },
    // {
    //   title: 'Earned',
    //   key: 'totalTokenEarned',
    //   render(record) {
    //     return <span>${record.stats.totalTokenEarned}</span>;
    //   }
    // },
    {
      title: 'Status',
      key: 'status',
      dataIndex: 'status',
      render(status: string) {
        switch (status) {
          case 'active':
            return <Tag color="green">Active</Tag>;
          case 'inactive':
            return <Tag color="Red">Inactive</Tag>;
          case 'pending':
            return <Tag color="orange">Pending</Tag>;
          default:
            return <Tag color="orange">Pending</Tag>;
        }
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (member) => (
        <Button member={member} updateMemberStatus={updateMemberStatus} />
      )
    }
  ];
  const dataSource = data.map((d) => ({ ...d, key: d._id }));
  return (
    <Table
      dataSource={dataSource}
      columns={columns}
      loading={searching}
      pagination={{ pageSize, total }}
      onChange={onChange}
      scroll={{ x: true }}
    />
  );
};
StudioModelsTable.defaultProps = { placeholderAvatarUrl: '' };
export default StudioModelsTable;
